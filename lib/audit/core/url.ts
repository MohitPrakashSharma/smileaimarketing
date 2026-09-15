/**
 * URL handling for the crawler. Two notions:
 *
 *  - `normalizeUrl`  → the canonical string we store and dedupe on. Lowercases
 *    scheme/host, drops the fragment and default ports, strips known tracking
 *    parameters, sorts the remaining query, collapses `/index.html`, and
 *    removes a trailing slash on non-root paths so `/about` and `/about/`
 *    are the same page for crawl purposes (the duplicate-variant check
 *    still sees both raw forms via redirect chains / canonicals).
 *  - `isSameSite`    → same registrable host ignoring `www.`, so a site can
 *    be crawled whether links use www or not, without wandering onto
 *    subdomains like blog.example.com (treated as external).
 */

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "ref", "igshid", "yclid", "_ga", "_gl",
]);

const SKIP_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|docx?|xlsx?|pptx?|zip|gz|tar|rar|7z|mp3|mp4|m4a|m4v|mov|avi|wmv|webm|ogg|wav|css|js|mjs|json|xml|txt|woff2?|ttf|eot|otf|exe|dmg|apk)$/i;

export function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Ensure a scheme; bare domains get https://. */
export function ensureScheme(raw: string): string {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function normalizeUrl(raw: string, base?: string): string | null {
  let u: URL;
  try {
    u = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) u.port = "";
  u.username = "";
  u.password = "";

  // Query: drop tracking params, sort the rest for stable keys.
  const params = new URLSearchParams(u.search);
  const kept: Array<[string, string]> = [];
  for (const [k, v] of params) if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.push([k, v]);
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  u.search = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";

  // Path: collapse index files, duplicate slashes, trailing slash (non-root).
  let path = u.pathname.replace(/\/{2,}/g, "/");
  path = path.replace(/\/(index|default)\.(html?|php|aspx?)$/i, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "") path = "/";
  u.pathname = path;

  return u.toString();
}

export function isSameSite(url: string, siteHost: string): boolean {
  const h = hostOf(url);
  return h !== null && stripWww(h) === stripWww(siteHost);
}

/** True for URLs that are worth fetching as pages (not assets/binaries, not mailto/tel/js). */
export function isCrawlableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (SKIP_EXTENSIONS.test(u.pathname)) return false;
    // wp-admin, feeds, logout/cart-style utility URLs are noise for an SEO audit
    if (/\/(wp-admin|wp-login\.php|wp-json|feed|xmlrpc\.php|cart|checkout|logout|login|signin|account|my-account|wp-content\/uploads)(\/|$)/i.test(u.pathname)) return false;
    if (/[?&](add-to-cart|replytocom|share|print)=/i.test(u.search)) return false;
    return true;
  } catch {
    return false;
  }
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** Human-friendly short form for report copy: "/services/emergency". */
export function shortUrl(url: string): string {
  const p = pathOf(url);
  return p.length > 60 ? `${p.slice(0, 57)}…` : p;
}

export function isHttps(url: string): boolean {
  return url.toLowerCase().startsWith("https://");
}

/** The www ↔ non-www twin of a host. */
export function alternateHost(host: string): string {
  return host.toLowerCase().startsWith("www.") ? host.slice(4) : `www.${host}`;
}

export function withHost(url: string, host: string): string {
  const u = new URL(url);
  u.hostname = host;
  return u.toString();
}

export function withProtocol(url: string, protocol: "http:" | "https:"): string {
  const u = new URL(url);
  u.protocol = protocol;
  return u.toString();
}

/** Utility pages that legitimately have little text — excluded from thin-content checks. */
export function isUtilityPath(url: string): boolean {
  const p = pathOf(url).toLowerCase();
  return /(^|\/)(contact|contact-us|privacy|privacy-policy|terms|terms-of-service|terms-and-conditions|cookie|cookies|sitemap|search|thank-you|thanks|404|accessibility|disclaimer|legal|careers|jobs|login|register|sign-?up|sign-?in|subscribe|newsletter|download|apply|book|booking|book-online|appointment|schedule|request-[a-z-]+|[a-z-]*(estimate|quote)[a-z-]*)(\/|$|\?)/.test(p);
}

export function urlKeyIgnoringTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
