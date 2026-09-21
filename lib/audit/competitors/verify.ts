import { parse as parseHtml } from "node-html-parser";

/**
 * Verifies a competitor by visiting its own website. The name and URL the
 * report shows come from here — the practice's own homepage (schema.org
 * name, og:site_name or <title>) and the final URL after redirects — never
 * from Google Places, whose content may not be stored (Maps Service Terms
 * §14.3: only place ids and, for 30 days, coordinates). A site that cannot
 * be fetched is not verified and is dropped from the comparison.
 */

export interface VerifiedSite {
  ok: boolean;
  url: string;
  name: string | null;
  status: number | null;
  error: string | null;
}

export type VerifyFetch = (url: string, init: RequestInit) => Promise<Response>;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const titleName = (t: string) => clean(t.split(/\s[|–—\-:·]\s/)[0]);

/**
 * Site builders and half-configured sites ship placeholder names ("My Wix
 * Site", "Home", "Welcome", "Untitled") that would look absurd next to a real
 * practice name. Anything that matches is treated as no name at all so the
 * caller falls back to the domain.
 */
const PLACEHOLDER_NAME = /^(my\s+(wix|vxw|new|site|website)\b.*|my site.*|home(\s*page)?|welcome(\s+to.*)?|untitled.*|website|homepage|index|new page|coming soon|site\s*\d*|wix\.com.*|squarespace.*|wordpress.*|just another wordpress site)$/i;
export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const n = clean(name);
  return n.length < 3 || PLACEHOLDER_NAME.test(n) || !/[a-zA-Z]/.test(n);
}

/** "cwfamilydental.ca" — a readable, honest fallback label when a site has no usable name. */
export function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url;
  }
}

export function extractSiteName(html: string): string | null {
  const root = parseHtml(html, { comment: false, blockTextElements: { script: true, style: true, title: true } });
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const nodes = [].concat(JSON.parse(s.text.trim()));
      for (const raw of nodes as Array<Record<string, unknown>>) {
        const list = Array.isArray(raw?.["@graph"]) ? (raw["@graph"] as Array<Record<string, unknown>>) : [raw];
        for (const node of list) {
          const type = String(node?.["@type"] ?? "");
          if (/Dentist|LocalBusiness|MedicalBusiness|Organization|MedicalClinic|Physician/i.test(type) && typeof node.name === "string" && node.name.trim()) return clean(node.name);
        }
      }
    } catch {
      /* invalid JSON-LD — try the next source */
    }
  }
  const candidates = [
    root.querySelector('meta[property="og:site_name"]')?.getAttribute("content"),
    root.querySelector('meta[name="application-name"]')?.getAttribute("content"),
    root.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    root.querySelector("title")?.text,
  ];
  for (const c of candidates) {
    if (!c || !c.trim()) continue;
    const name = titleName(c);
    if (!isPlaceholderName(name)) return name;
  }
  return null;
}

export async function verifySite(website: string, opts: { fetchImpl?: VerifyFetch; timeoutMs?: number } = {}): Promise<VerifiedSite> {
  const fetchImpl = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetchImpl(website, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; SmileAIAudit/1.0; +https://smileaimarketing.com)", Accept: "text/html,application/xhtml+xml" } });
    const finalUrl = (() => {
      try {
        const u = new URL(res.url || website);
        return `${u.protocol}//${u.host}/`;
      } catch {
        return website;
      }
    })();
    if (!res.ok) return { ok: false, url: finalUrl, name: null, status: res.status, error: `HTTP ${res.status}` };
    const html = (await res.text()).slice(0, 512 * 1024);
    const name = extractSiteName(html);
    return { ok: true, url: finalUrl, name: isPlaceholderName(name) ? null : name, status: res.status, error: null };
  } catch (e) {
    const err = e as Error;
    return { ok: false, url: website, name: null, status: null, error: err.name === "AbortError" ? "timed out" : err.message || "network error" };
  } finally {
    clearTimeout(timer);
  }
}
