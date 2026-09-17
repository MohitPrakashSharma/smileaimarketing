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
  const og = root.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
  if (og && og.trim()) return clean(og);
  const title = root.querySelector("title")?.text;
  if (title && title.trim()) return titleName(title);
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
    return { ok: true, url: finalUrl, name: extractSiteName(html), status: res.status, error: null };
  } catch (e) {
    const err = e as Error;
    return { ok: false, url: website, name: null, status: null, error: err.name === "AbortError" ? "timed out" : err.message || "network error" };
  } finally {
    clearTimeout(timer);
  }
}
