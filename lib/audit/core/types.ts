/**
 * Shared types for the v2 audit engine. Everything under lib/audit/core,
 * lib/audit/checks and lib/audit/findings is pure: no database, no network
 * except through the injected fetcher, no AI. That keeps checks testable
 * against fixture sites and keeps the pipeline order honest:
 * evidence → deterministic checks → findings/scoring → (later) AI explanation.
 */

export interface FetchResult {
  ok: boolean;
  url: string; // requested (normalized) url
  finalUrl: string;
  status: number | null;
  /** Time until response headers arrived for the final hop (true TTFB, excludes body download). */
  ttfbMs: number | null;
  redirectChain: string[]; // every hop including the first request
  headers: Record<string, string>;
  contentType: string | null;
  body: string | null; // text body when HTML/text and within size limit
  bytes: number;
  ms: number;
  error?: string;
  errorCode?: "timeout" | "blocked_host" | "too_large" | "unsupported_type" | "network" | "too_many_redirects";
}

export interface FetchOptions {
  method?: "GET" | "HEAD";
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
  /** Only accept these content types for a body (substring match). Others return body=null, errorCode=unsupported_type. */
  acceptTypes?: string[];
}

export interface LinkFact {
  href: string; // absolute, normalized
  text: string;
  rel: string | null;
  internal: boolean;
  nofollow: boolean;
}

export interface ImageFact {
  src: string;
  alt: string | null;
  hasDimensions: boolean;
  loading: string | null;
  bytes?: number | null; // filled by the crawler for a sample
}

export interface PageFacts {
  hasDoctype: boolean;
  lang: string | null;
  charset: string | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null; // absolute
  robotsMeta: string | null;
  viewport: boolean;
  h1: string[];
  headingCounts: Record<string, number>;
  headingSequence: number[]; // [1,2,2,3,…] in document order, for skipped-level detection
  /** Headings with text, document order (capped at 60) — outline for the AI evidence. */
  headings: Array<{ level: number; text: string }>;
  wordCount: number;
  textHash: string;
  textSample: string; // first ~300 chars of visible text
  /** Cleaned visible main-content text (capped at 15k chars) — never persisted raw; used to build AI evidence. */
  mainText: string;
  links: LinkFact[];
  images: ImageFact[];
  schemaTypes: string[];
  schemaErrors: number;
  schemaNodes: Array<Record<string, unknown>>;
  hasTelLink: boolean;
  hasForm: boolean;
  hasPrimaryCta: boolean;
  ctaSample: string | null;
  ogTagsPresent: boolean;
  mixedContentUrls: string[];
  scriptBytesEstimate: number; // sum of inline script lengths + count of external scripts × 50KB estimate
  externalScriptCount: number;
  hasPhoneText: boolean;
  hasAddressText: boolean;
  /** Words in the whole body (nav/footer included) — used for the client-rendering heuristic. */
  bodyWordCount: number;
  /** An empty SPA mount point (#root/#__next/#app) with almost no body text. */
  spaRootEmpty: boolean;
  /** HTTP 200 but the title/H1 says "not found"/"error" and the page is small. */
  looksLikeErrorPage: boolean;
}

export interface CrawledPage {
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  fetchError: string | null;
  redirectChain: string[];
  contentType: string | null;
  /** Click depth from the homepage via links; null = only known from the sitemap (never linked). */
  depth: number | null;
  discoveredVia: "seed" | "sitemap" | "link";
  parentUrl: string | null;
  inSitemap: boolean;
  fetchMs: number | null;
  ttfbMs: number | null;
  htmlBytes: number | null;
  isHttps: boolean;
  headers: Record<string, string>;
  facts: PageFacts | null; // null when not HTML / failed
  xRobotsTag: string | null;
  /** Derived: page is a 200 HTML page whose canonical (if any) is itself and no noindex. */
  indexable: boolean | null;
}

export interface LinkCheckResult {
  url: string;
  status: number | null;
  ok: boolean;
  /** true when the target answered 429/503 or timed out — inconclusive, not broken */
  inconclusive?: boolean;
  finalUrl?: string;
  error?: string;
  sources: string[]; // pages linking to it (sample)
  internal: boolean;
}

export interface RobotsInfo {
  fetched: boolean;
  status: number | null;
  body: string | null;
  sitemaps: string[];
  blocksAll: boolean;
  /** disallow rules that apply to our UA (or *), for evidence */
  disallow: string[];
  allow: string[];
}

export interface SitemapInfo {
  attemptedUrls: string[];
  /** false when every attempt failed at the network level (timeout/DNS) — "missing" is then unknowable */
  reachable: boolean;
  found: boolean;
  parseErrors: string[];
  urls: string[]; // deduped, normalized, same-site only
  sitemapCount: number;
  truncated: boolean;
}

export interface HostVariantProbe {
  /** http://host/ → what happened */
  httpProbe: FetchResult | null;
  /** the alternate host (www ↔ non-www) → what happened */
  altHostProbe: FetchResult | null;
  altHost: string | null;
}

export interface CrawlStats {
  pagesDiscovered: number;
  pagesCrawled: number;
  pagesSkipped: number;
  robotsBlocked: number;
  /** Responses with 429 (or 503 + Retry-After) — the site throttled us; those pages are not "broken". */
  rateLimited: number;
  durationMs: number;
  budgetHit: "none" | "pages" | "time" | "bytes";
  totalBytes: number;
  linkChecks: number;
}

export interface CrawlBlock {
  status: number | null;
  /** "cloudflare" | "datadome" | "akamai" | "perimeterx" | "imperva" | "captcha" | "forbidden" | "unknown" */
  vendor: string;
  detail: string;
}

export interface CrawlResult {
  seedUrl: string;
  /** Host the seed actually landed on (after redirects) — the site's canonical host. */
  canonicalHost: string;
  origin: string;
  /** Set when the homepage was refused by bot protection / 403 — nothing downstream is measurable. */
  blocked: CrawlBlock | null;
  pages: CrawledPage[];
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  hostProbe: HostVariantProbe;
  linkChecks: LinkCheckResult[];
  stats: CrawlStats;
}

export interface CrawlBudget {
  maxPages: number;
  maxDurationMs: number;
  maxTotalBytes: number;
  maxPageBytes: number;
  concurrency: number;
  fetchTimeoutMs: number;
  maxLinkChecks: number;
  maxImageProbes: number;
  /** Time-box for the post-crawl link/host/image probes, so the audit never sits silently. */
  maxProbeMs: number;
  /** Minimum gap between requests to the same host (politeness). */
  politenessDelayMs: number;
}

export const DEFAULT_BUDGET: CrawlBudget = {
  maxPages: 40,
  maxDurationMs: 90_000,
  maxTotalBytes: 40 * 1024 * 1024,
  maxPageBytes: 4 * 1024 * 1024,
  concurrency: 3,
  fetchTimeoutMs: 10_000,
  maxLinkChecks: 100,
  maxImageProbes: 20,
  maxProbeMs: 25_000,
  politenessDelayMs: 150,
};

export type ProgressStageKey = "detect" | "sitemap" | "crawl" | "technical" | "content" | "performance" | "ai" | "search" | "finalize" | "done";

export interface CrawlProgressEvent {
  stage: "sitemap" | "crawl" | "probe";
  pagesCrawled: number;
  pagesDiscovered: number;
  detail?: string;
}
