import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { FetchOptions, FetchResult } from "./types";

/**
 * The only way the audit engine touches the network.
 *
 *  - SSRF guard: hostnames are resolved first and every address must be a
 *    public unicast IP. Each redirect hop is re-validated, so a public host
 *    can't bounce us to 169.254.169.254 or 127.0.0.1.
 *  - Redirects are followed manually (max 5) so the chain is recorded —
 *    the redirect checks depend on it.
 *  - Bodies are streamed with a byte cap; oversize responses are cut off
 *    and reported rather than buffered.
 *  - Only HTML/text/XML bodies are read; anything else returns headers only.
 *  - A per-Fetcher cache (URL+method) guarantees one request per URL per
 *    audit even when several checks want the same page.
 *
 * `fetchImpl` and `resolve` are injectable so tests run fully offline with
 * fixture sites and never depend on DNS.
 */

export const DEFAULT_UA = "Mozilla/5.0 (compatible; SmileAIAuditBot/2.0; +https://smileaimarketing.com/bot)";

export type FetchImpl = (url: string, init: { method: string; headers: Record<string, string>; redirect: "manual"; signal: AbortSignal }) => Promise<Response>;
export type Resolver = (hostname: string) => Promise<string[]>;

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata"]);

/** True when an IPv4/IPv6 address is not publicly routable. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true; // 10/8
    if (a === 127) return true; // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7)); // v4-mapped
    if (lower.startsWith("2002:")) return true; // 6to4 — treat as untrusted
    return false;
  }
  return true; // not an IP at all
}

export const defaultResolver: Resolver = async (hostname) => {
  const results = await dnsLookup(hostname, { all: true });
  return results.map((r) => r.address);
};

/**
 * Validates a URL's host: not a blocked name, resolves, and every address is
 * public. Returns an error string or null.
 */
export async function checkHostAllowed(url: string, resolve: Resolver): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "invalid url";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return `unsupported protocol ${u.protocol}`;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return `blocked host ${host}`;
  if (isIP(host)) return isPrivateAddress(host) ? `private address ${host}` : null;
  if (!/^([a-z0-9-]+\.)+[a-z0-9-]{2,}$/i.test(host)) return `not a public hostname: ${host}`;
  let addrs: string[];
  try {
    addrs = await resolve(host);
  } catch {
    return `dns lookup failed for ${host}`;
  }
  if (!addrs.length) return `dns returned no addresses for ${host}`;
  const bad = addrs.find(isPrivateAddress);
  return bad ? `host ${host} resolves to private address ${bad}` : null;
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<{ text: string; bytes: number; truncated: boolean }> {
  if (!res.body) {
    const t = await res.text();
    return { text: t, bytes: Buffer.byteLength(t), truncated: false };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        chunks.push(value.subarray(0, value.byteLength - (bytes - maxBytes)));
        truncated = true;
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
    }
  }
  const text = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  return { text, bytes: truncated ? maxBytes : bytes, truncated };
}

const TEXT_TYPES = ["text/html", "application/xhtml+xml", "text/plain", "text/xml", "application/xml", "application/rss+xml", "application/atom+xml"];

export class Fetcher {
  private cache = new Map<string, Promise<FetchResult>>();
  public totalBytes = 0;
  public requestCount = 0;

  constructor(
    private readonly fetchImpl: FetchImpl = (url, init) => fetch(url, init),
    private readonly resolve: Resolver = defaultResolver,
    private readonly defaults: Required<Pick<FetchOptions, "timeoutMs" | "maxBytes" | "maxRedirects" | "userAgent">> = {
      timeoutMs: 10_000,
      maxBytes: 2 * 1024 * 1024,
      maxRedirects: 5,
      userAgent: DEFAULT_UA,
    }
  ) {}

  /** Cached: identical URL+method → one request. */
  fetch(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
    const key = `${opts.method ?? "GET"} ${url}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const p = this.doFetch(url, opts);
    this.cache.set(key, p);
    return p;
  }

  private async doFetch(startUrl: string, opts: FetchOptions): Promise<FetchResult> {
    const method = opts.method ?? "GET";
    const timeoutMs = opts.timeoutMs ?? this.defaults.timeoutMs;
    const maxBytes = opts.maxBytes ?? this.defaults.maxBytes;
    const maxRedirects = opts.maxRedirects ?? this.defaults.maxRedirects;
    const acceptTypes = opts.acceptTypes ?? TEXT_TYPES;
    const chain: string[] = [startUrl];
    const started = Date.now();
    let current = startUrl;

    let ttfbMs: number | null = null;
    const fail = (error: string, errorCode: FetchResult["errorCode"], status: number | null = null, headers: Record<string, string> = {}): FetchResult => ({
      ok: false,
      url: startUrl,
      finalUrl: current,
      status,
      ttfbMs,
      redirectChain: chain,
      headers,
      contentType: headers["content-type"] ?? null,
      body: null,
      bytes: 0,
      ms: Date.now() - started,
      error,
      errorCode,
    });

    for (let hop = 0; hop <= maxRedirects; hop++) {
      const blocked = await checkHostAllowed(current, this.resolve);
      if (blocked) return fail(blocked, "blocked_host");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      const hopStarted = Date.now();
      try {
        this.requestCount++;
        res = await this.fetchImpl(current, {
          method,
          headers: { "User-Agent": opts.userAgent ?? this.defaults.userAgent, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5", "Accept-Language": "en" },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const e = err as Error & { cause?: { code?: string } };
        if (e.name === "AbortError") return fail(`timed out after ${timeoutMs}ms`, "timeout");
        const code = e.cause?.code;
        return fail(code ? `${code}` : e.message || "network error", "network");
      }

      const headers = headersToObject(res.headers);
      const status = res.status;
      ttfbMs = Date.now() - hopStarted;

      if (status >= 300 && status < 400 && headers["location"]) {
        clearTimeout(timer);
        let next: string;
        try {
          next = new URL(headers["location"], current).toString();
        } catch {
          return fail(`invalid redirect location ${headers["location"]}`, "network", status, headers);
        }
        // consume/cancel the body so the connection is released
        await res.body?.cancel().catch(() => undefined);
        chain.push(next);
        current = next;
        if (hop === maxRedirects) return fail(`more than ${maxRedirects} redirects`, "too_many_redirects", status, headers);
        continue;
      }

      const contentType = (headers["content-type"] ?? "").toLowerCase() || null;
      const isText = contentType ? acceptTypes.some((t) => contentType.includes(t)) : method === "GET"; // no content-type: sniff by reading
      let body: string | null = null;
      let bytes = 0;
      let truncated = false;
      if (method === "GET" && isText) {
        try {
          const r = await readBodyCapped(res, maxBytes);
          body = r.text;
          bytes = r.bytes;
          truncated = r.truncated;
        } catch (err) {
          clearTimeout(timer);
          const e = err as Error;
          if (e.name === "AbortError") return fail(`timed out reading body after ${timeoutMs}ms`, "timeout", status, headers);
          return fail(e.message || "read error", "network", status, headers);
        }
      } else {
        const len = Number(headers["content-length"]);
        bytes = Number.isFinite(len) ? len : 0;
        await res.body?.cancel().catch(() => undefined);
      }
      clearTimeout(timer);
      this.totalBytes += bytes;

      return {
        ok: status >= 200 && status < 300,
        url: startUrl,
        finalUrl: current,
        status,
        ttfbMs,
        redirectChain: chain,
        headers,
        contentType,
        body,
        bytes,
        ms: Date.now() - started,
        ...(truncated ? { error: `body truncated at ${maxBytes} bytes`, errorCode: "too_large" as const } : {}),
        ...(!isText && method === "GET" ? { error: `unsupported content type ${contentType}`, errorCode: "unsupported_type" as const } : {}),
      };
    }
    return fail("redirect loop", "too_many_redirects");
  }
}

/**
 * Bot-protection / access-denied detection. A 403/401/429/503 on the
 * homepage, or vendor headers / challenge markup, means the site refused
 * automated access — the audit must report "not measurable", not "broken".
 */
export function detectBlock(res: FetchResult): { vendor: string; detail: string } | null {
  const h = res.headers;
  const body = (res.body ?? "").slice(0, 20_000);
  const vendor =
    h["x-datadome"] || h["x-datadome-cid"] ? "datadome"
    : h["cf-mitigated"] === "challenge" || /cf-chl|challenge-platform|__cf_chl/i.test(body) ? "cloudflare"
    : h["x-akamai-transformed"] && res.status === 403 ? "akamai"
    : /_pxhd|perimeterx|px-captcha/i.test(body) ? "perimeterx"
    : /incapsula|imperva|_incap_ses/i.test(body) ? "imperva"
    : /captcha|are you a human|verify you are human|bot detection|automated access|access denied|attention required/i.test(body) && (res.status === null || res.status >= 400 || (res.body ?? "").length < 8000) ? "captcha"
    : null;
  const denied = res.status === 403 || res.status === 401 || res.status === 429 || (res.status === 503 && Boolean(h["retry-after"] || vendor));
  if (!vendor && !denied) return null;
  return { vendor: vendor ?? "forbidden", detail: `HTTP ${res.status ?? "—"}${vendor ? ` · ${vendor}` : ""}` };
}
