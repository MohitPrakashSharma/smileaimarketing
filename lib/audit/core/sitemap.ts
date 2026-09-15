import type { Fetcher } from "./fetch";
import { normalizeUrl, isSameSite, isCrawlableUrl } from "./url";
import type { SitemapInfo } from "./types";

/**
 * Sitemap discovery: robots.txt `Sitemap:` lines first, then the usual
 * locations. Handles sitemap indexes (one level of recursion, capped), and
 * tolerates sloppy XML by extracting <loc> elements with a regex rather than
 * a strict parser — real-world sitemaps are frequently malformed and we'd
 * rather report "found but invalid" than throw.
 */

const MAX_SITEMAPS = 8;
const MAX_URLS = 2000;
const CANDIDATES = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/wp-sitemap.xml", "/sitemap.php", "/sitemap.txt"];

export function extractLocs(xml: string): { locs: string[]; isIndex: boolean; looksLikeSitemap: boolean } {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const looksLikeSitemap = isIndex || /<urlset[\s>]/i.test(xml);
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    locs.push(m[1].replace(/&amp;/g, "&").trim());
    if (locs.length > MAX_URLS * 2) break;
  }
  return { locs, isIndex, looksLikeSitemap };
}

export async function discoverSitemap(fetcher: Fetcher, origin: string, siteHost: string, robotsSitemaps: string[]): Promise<SitemapInfo> {
  const attempted: string[] = [];
  const parseErrors: string[] = [];
  const urls = new Set<string>();
  let found = false;
  let reachable = false;
  let sitemapCount = 0;
  let truncated = false;

  const candidates = [...robotsSitemaps.map((s) => normalizeUrl(s, origin)).filter((s): s is string => Boolean(s)), ...CANDIDATES.map((p) => `${origin}${p}`)];
  const seen = new Set<string>();

  const queue = [...candidates];
  while (queue.length && sitemapCount < MAX_SITEMAPS) {
    const smUrl = queue.shift()!;
    if (seen.has(smUrl) || !isSameSite(smUrl, siteHost)) continue;
    seen.add(smUrl);
    attempted.push(smUrl);

    const res = await fetcher.fetch(smUrl, { acceptTypes: ["xml", "text/plain", "text/html"], maxBytes: 5 * 1024 * 1024 });
    if (res.status !== null) reachable = true;
    if (!res.ok || !res.body) continue;

    // Plain-text sitemap: one URL per line.
    if (smUrl.endsWith(".txt")) {
      const lines = res.body.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
      if (lines.length) {
        found = true;
        sitemapCount++;
        for (const l of lines) addUrl(l);
      }
      continue;
    }

    const { locs, isIndex, looksLikeSitemap } = extractLocs(res.body);
    if (!looksLikeSitemap) {
      // A 200 HTML page at /sitemap.xml is a common misconfiguration.
      if (/<html/i.test(res.body)) parseErrors.push(`${smUrl} returned an HTML page, not XML`);
      continue;
    }
    found = true;
    sitemapCount++;
    if (locs.length === 0) parseErrors.push(`${smUrl} contains no <loc> entries`);
    if (isIndex) {
      for (const child of locs) {
        const n = normalizeUrl(child, origin);
        if (n) queue.push(n);
      }
      // After an index, stop trying the generic candidates.
      queue.splice(0, queue.length, ...queue.filter((q) => !CANDIDATES.some((c) => q === `${origin}${c}`)));
    } else {
      for (const l of locs) addUrl(l);
    }
    if (urls.size >= MAX_URLS) {
      truncated = true;
      break;
    }
    // Once a real sitemap is found, don't keep probing the other guesses.
    if (!isIndex && !robotsSitemaps.length) queue.splice(0, queue.length, ...queue.filter((q) => !CANDIDATES.some((c) => q === `${origin}${c}`)));
  }

  function addUrl(raw: string) {
    const n = normalizeUrl(raw, origin);
    if (n && isSameSite(n, siteHost) && isCrawlableUrl(n) && urls.size < MAX_URLS) urls.add(n);
  }

  return { attemptedUrls: attempted, reachable, found, parseErrors, urls: [...urls], sitemapCount, truncated };
}
