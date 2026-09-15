import { detectBlock, type Fetcher } from "./fetch";
import { parsePage } from "./parse";
import { parseRobots, isAllowed, toRobotsInfo, type RobotsRules } from "./robots";
import { discoverSitemap } from "./sitemap";
import { normalizeUrl, isSameSite, isCrawlableUrl, hostOf, alternateHost, withHost, withProtocol, isHttps, ensureScheme } from "./url";
import type { RenderFallback } from "./render";
import { DEFAULT_BUDGET, type CrawlBudget, type CrawlResult, type CrawledPage, type LinkCheckResult, type CrawlProgressEvent, type HostVariantProbe } from "./types";

/**
 * Bounded same-site BFS crawler.
 *
 *   seed (homepage) + sitemap URLs → queue → fetch with concurrency N
 *   → parse → enqueue internal links (depth+1) → stop on page/time/byte budget
 *
 * Then: HEAD-check a sample of internal/external links for broken-link
 * detection, probe http:// and the www/non-www twin for redirect checks, and
 * size a sample of images. Every fetch goes through the injected Fetcher
 * (SSRF guard, timeouts, cache).
 */

export interface CrawlOptions {
  budget?: Partial<CrawlBudget>;
  onProgress?: (e: CrawlProgressEvent) => void | Promise<void>;
  renderFallback?: RenderFallback;
  userAgentToken?: string;
}

const SECURITY_HEADERS = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "x-robots-tag", "server", "cache-control", "content-encoding"];

function pickHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of SECURITY_HEADERS) if (h[k]) out[k] = h[k].slice(0, 300);
  return out;
}

function deriveIndexable(page: Omit<CrawledPage, "indexable">): boolean | null {
  if (page.statusCode !== 200 || !page.facts) return page.statusCode === null ? null : false;
  const robots = `${page.facts.robotsMeta ?? ""} ${page.xRobotsTag ?? ""}`.toLowerCase();
  if (/\bnoindex\b/.test(robots) || /\bnone\b/.test(robots)) return false;
  if (page.facts.canonical && page.facts.canonical !== (page.finalUrl ?? page.url)) return false;
  return true;
}

/**
 * Worker pool over a queue that can refill while running (the BFS pushes
 * links as pages are parsed). Runners exit only when the queue is empty AND
 * no runner is mid-task, or when `shouldStop` says the budget is spent.
 */
async function runPool<T>(next: () => T | undefined, worker: (item: T) => Promise<void>, concurrency: number, shouldStop: () => boolean): Promise<void> {
  let active = 0;
  const runner = async () => {
    for (;;) {
      if (shouldStop()) return;
      const item = next();
      if (item === undefined) {
        if (active === 0) return;
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      active++;
      try {
        await worker(item);
      } finally {
        active--;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, runner));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True for responses that mean "slow down", not "this page is broken". */
export function isRateLimited(status: number | null, headers: Record<string, string>): boolean {
  return status === 429 || (status === 503 && Boolean(headers["retry-after"]));
}

export async function crawlSite(fetcher: Fetcher, startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const budget: CrawlBudget = { ...DEFAULT_BUDGET, ...options.budget };
  const started = Date.now();
  // Politeness: a small gap between requests; on a 429 the gap grows and the
  // crawl effectively drops to one request at a time for a while.
  let politeness = budget.politenessDelayMs;
  let rateLimited = 0;
  let nextSlot = 0;
  const polite = async () => {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + politeness;
    if (wait > 0) await sleep(wait);
  };
  const noteRateLimit = () => {
    rateLimited++;
    politeness = Math.min(3000, Math.max(politeness * 3, 750));
    nextSlot = Date.now() + politeness;
  };
  const seed = normalizeUrl(ensureScheme(startUrl));
  if (!seed) throw new Error(`Invalid start URL: ${startUrl}`);
  const siteHost = hostOf(seed)!;
  const origin = new URL(seed).origin;

  // --- robots.txt ---
  const robotsRes = await fetcher.fetch(`${origin}/robots.txt`, { acceptTypes: ["text/plain", "text/html", "xml"], maxBytes: 512 * 1024 });
  const robotsRules: RobotsRules | null = robotsRes.ok && robotsRes.body && !/<html/i.test(robotsRes.body.slice(0, 500)) ? parseRobots(robotsRes.body, options.userAgentToken) : null;
  const robots = toRobotsInfo(robotsRes.status, robotsRes.ok ? robotsRes.body : null, robotsRules);
  await options.onProgress?.({ stage: "sitemap", pagesCrawled: 0, pagesDiscovered: 1, detail: "robots.txt checked" });

  // --- sitemap ---
  const sitemap = await discoverSitemap(fetcher, origin, siteHost, robots.sitemaps);
  await options.onProgress?.({ stage: "sitemap", pagesCrawled: 0, pagesDiscovered: 1 + sitemap.urls.length, detail: sitemap.found ? `${sitemap.urls.length} URLs in sitemap` : "no sitemap found" });

  // --- seed first: establishes the canonical host and detects bot protection ---
  // The seed gets double the per-page timeout: a slow homepage should be
  // measured (and reported as slow), not written off as unreachable.
  const seedRes = await fetcher.fetch(seed, { timeoutMs: budget.fetchTimeoutMs * 2, maxBytes: budget.maxPageBytes });
  const canonicalHost = hostOf(seedRes.finalUrl) ?? siteHost;
  const block = detectBlock(seedRes);
  if (block) {
    const page: CrawledPage = {
      url: seed, finalUrl: normalizeUrl(seedRes.finalUrl), statusCode: seedRes.status, fetchError: `blocked by bot protection (${block.detail})`, redirectChain: seedRes.redirectChain, contentType: seedRes.contentType,
      depth: 0, discoveredVia: "seed", parentUrl: null, inSitemap: false, fetchMs: seedRes.ms, ttfbMs: seedRes.ttfbMs, htmlBytes: seedRes.bytes, isHttps: isHttps(seedRes.finalUrl), headers: pickHeaders(seedRes.headers), facts: null, xRobotsTag: null, indexable: null,
    };
    return {
      seedUrl: seed, canonicalHost, origin, blocked: { status: seedRes.status, vendor: block.vendor, detail: block.detail }, pages: [page], robots, sitemap,
      hostProbe: { httpProbe: null, altHostProbe: null, altHost: null }, linkChecks: [],
      stats: { pagesDiscovered: 1, pagesCrawled: 1, pagesSkipped: sitemap.urls.length, robotsBlocked: 0, rateLimited: 0, durationMs: Date.now() - started, budgetHit: "none", totalBytes: fetcher.totalBytes, linkChecks: 0 },
    };
  }

  // --- BFS ---
  // Two queues: pages discovered through links (true click depth, BFS order)
  // are crawled first; sitemap-only URLs fill whatever budget is left. Depth
  // is tracked per URL and updated when a shorter path is found.
  const pages = new Map<string, CrawledPage>();
  const queued = new Set<string>([seed]);
  const depthOf = new Map<string, number>([[seed, 0]]);
  type Item = { url: string; via: CrawledPage["discoveredVia"]; parent: string | null };
  const linkQueue: Item[] = [];
  const sitemapQueue: Item[] = [];
  const sitemapSet = new Set(sitemap.urls);
  for (const u of sitemap.urls) {
    if (!queued.has(u)) {
      queued.add(u);
      sitemapQueue.push({ url: u, via: "sitemap", parent: null });
    }
  }
  let robotsBlocked = 0;
  let skipped = 0;
  let budgetHit: CrawlResult["stats"]["budgetHit"] = "none";
  let crawled = 0;
  let taken = 0; // fetches started — budget is enforced here so concurrency can't overshoot

  const overBudget = () => {
    if (taken >= budget.maxPages) return (budgetHit = "pages"), true;
    if (Date.now() - started > budget.maxDurationMs) return (budgetHit = "time"), true;
    if (fetcher.totalBytes > budget.maxTotalBytes) return (budgetHit = "bytes"), true;
    return false;
  };

  const blockedPage = (item: Item): CrawledPage => ({
    url: item.url, finalUrl: null, statusCode: null, fetchError: "blocked by robots.txt", redirectChain: [item.url], contentType: null,
    depth: depthOf.get(item.url) ?? null, discoveredVia: item.via, parentUrl: item.parent, inSitemap: sitemapSet.has(item.url), fetchMs: null, ttfbMs: null, htmlBytes: null,
    isHttps: isHttps(item.url), headers: {}, facts: null, xRobotsTag: null, indexable: null,
  });

  const take = (): Item | undefined => {
    for (;;) {
      if (overBudget()) return undefined;
      const item = linkQueue.shift() ?? sitemapQueue.shift();
      if (!item) return undefined;
      if (robotsRules && !isAllowed(robotsRules, item.url)) {
        robotsBlocked++;
        pages.set(item.url, blockedPage(item));
        continue;
      }
      taken++;
      return item;
    }
  };

  const enqueueLinks = (fromUrl: string, facts: NonNullable<CrawledPage["facts"]>) => {
    const parentDepth = depthOf.get(fromUrl) ?? 0;
    for (const link of facts.links) {
      if (!link.internal || !isCrawlableUrl(link.href)) continue;
      const d = parentDepth + 1;
      const known = depthOf.get(link.href);
      if (known === undefined || d < known) depthOf.set(link.href, d);
      if (queued.has(link.href)) {
        // Promote a sitemap-only entry to the link queue now that it is linked.
        const idx = sitemapQueue.findIndex((q) => q.url === link.href);
        if (idx !== -1) linkQueue.push({ ...sitemapQueue.splice(idx, 1)[0], via: "link", parent: fromUrl });
        continue;
      }
      if (queued.size >= budget.maxPages * 6) {
        skipped++;
        continue;
      }
      queued.add(link.href);
      linkQueue.push({ url: link.href, via: "link", parent: fromUrl });
    }
  };

  const recordPage = async (item: Item, res: Awaited<ReturnType<Fetcher["fetch"]>>) => {
    crawled++;
    if (isRateLimited(res.status, res.headers)) noteRateLimit();
    const finalUrl = res.finalUrl ? normalizeUrl(res.finalUrl) ?? res.finalUrl : null;
    const isHtml = Boolean(res.body) && (res.contentType?.includes("html") ?? /<html|<!doctype/i.test(res.body?.slice(0, 500) ?? ""));
    let facts = res.ok && isHtml && res.body ? parsePage(res.body, finalUrl ?? item.url, siteHost) : null;

    // Optional JS-rendering hook — only for pages that genuinely look client-rendered.
    if (facts && options.renderFallback && options.renderFallback.shouldRender(facts, res)) {
      const rendered = await options.renderFallback.render(finalUrl ?? item.url).catch(() => null);
      if (rendered) facts = parsePage(rendered, finalUrl ?? item.url, siteHost);
    }

    const base: Omit<CrawledPage, "indexable"> = {
      url: item.url,
      finalUrl,
      statusCode: res.status,
      fetchError: isRateLimited(res.status, res.headers) ? `rate limited (HTTP ${res.status})` : (res.error ?? null),
      redirectChain: res.redirectChain,
      contentType: res.contentType,
      depth: depthOf.get(item.url) ?? null,
      discoveredVia: item.via,
      parentUrl: item.parent,
      inSitemap: sitemapSet.has(item.url),
      fetchMs: res.ms,
      ttfbMs: res.ttfbMs,
      htmlBytes: res.bytes,
      isHttps: isHttps(finalUrl ?? item.url),
      headers: pickHeaders(res.headers),
      facts,
      xRobotsTag: res.headers["x-robots-tag"] ?? null,
    };
    pages.set(item.url, { ...base, indexable: deriveIndexable(base) });

    // A redirect that lands on a different same-site URL: the target is a page too, at the same depth.
    if (finalUrl && finalUrl !== item.url && isSameSite(finalUrl, siteHost) && !queued.has(finalUrl) && isCrawlableUrl(finalUrl)) {
      queued.add(finalUrl);
      depthOf.set(finalUrl, depthOf.get(item.url) ?? 0);
      linkQueue.push({ url: finalUrl, via: item.via, parent: item.parent });
    }
    if (facts) enqueueLinks(item.url, facts);
    await options.onProgress?.({ stage: "crawl", pagesCrawled: crawled, pagesDiscovered: queued.size });
  };

  // Seed already fetched above — record it first so its links lead the queue.
  taken++;
  await recordPage({ url: seed, via: "seed", parent: null }, seedRes);

  await runPool(
    take,
    async (item) => {
      await polite();
      const res = await fetcher.fetch(item.url, { timeoutMs: budget.fetchTimeoutMs, maxBytes: budget.maxPageBytes });
      await recordPage(item, res);
    },
    budget.concurrency,
    overBudget
  );

  skipped += linkQueue.length + sitemapQueue.length;

  // --- broken link sampling ---
  const linkTargets = new Map<string, { internal: boolean; sources: Set<string> }>();
  for (const p of pages.values()) {
    if (!p.facts) continue;
    for (const l of p.facts.links) {
      if (pages.has(l.href)) continue; // crawled pages already have a status
      const entry = linkTargets.get(l.href) ?? { internal: l.internal, sources: new Set<string>() };
      if (entry.sources.size < 5) entry.sources.add(p.url);
      linkTargets.set(l.href, entry);
    }
  }
  const linkChecks: LinkCheckResult[] = [];
  const targets = [...linkTargets.entries()].sort((a, b) => Number(b[1].internal) - Number(a[1].internal)).slice(0, budget.maxLinkChecks);
  const probeStarted = Date.now();
  const probeTimeLeft = () => budget.maxProbeMs - (Date.now() - probeStarted);
  let li = 0;
  let lastProbeProgress = 0;
  await runPool(
    () => (probeTimeLeft() <= 0 ? undefined : targets[li++]),
    async ([url, meta]) => {
      await polite();
      let res = await fetcher.fetch(url, { method: "HEAD", timeoutMs: 6000, maxRedirects: 5 });
      if (res.status === 405 || res.status === 403 || res.errorCode === "network") res = await fetcher.fetch(url, { method: "GET", timeoutMs: 6000, maxBytes: 64 * 1024, acceptTypes: ["*/"] });
      const limited = isRateLimited(res.status, res.headers);
      if (limited) noteRateLimit();
      const inconclusive = limited || res.errorCode === "timeout";
      linkChecks.push({ url, status: res.status, ok: inconclusive || (res.status !== null && res.status < 400), inconclusive, finalUrl: res.finalUrl, error: res.error, sources: [...meta.sources], internal: meta.internal });
      if (Date.now() - lastProbeProgress > 1500) {
        lastProbeProgress = Date.now();
        await options.onProgress?.({ stage: "probe", pagesCrawled: crawled, pagesDiscovered: queued.size, detail: `checking links ${linkChecks.length}/${targets.length}` });
      }
    },
    Math.min(2, budget.concurrency),
    () => false
  );

  // --- host variant probes (http → https, www ↔ non-www) ---
  await options.onProgress?.({ stage: "probe", pagesCrawled: crawled, pagesDiscovered: queued.size, detail: "checking https and www variants" });
  // Probe against the host the site actually lives on (www vs non-www is
  // decided by where the seed landed, not by what the user typed).
  const canonicalSeed = withHost(seed, canonicalHost);
  const hostProbe: HostVariantProbe = { httpProbe: null, altHostProbe: null, altHost: null };
  if (isHttps(seedRes.finalUrl)) hostProbe.httpProbe = await fetcher.fetch(withProtocol(canonicalSeed, "http:"), { method: "GET", timeoutMs: 8000, maxBytes: 64 * 1024 });
  hostProbe.altHost = alternateHost(canonicalHost);
  hostProbe.altHostProbe = await fetcher.fetch(withHost(canonicalSeed, hostProbe.altHost), { method: "GET", timeoutMs: 8000, maxBytes: 64 * 1024 });

  // --- image weight sampling (HEAD for content-length), within the probe time-box ---
  const imgSeen = new Set<string>();
  let probes = 0;
  outer: for (const p of pages.values()) {
    if (!p.facts) continue;
    for (const img of p.facts.images) {
      if (probes >= budget.maxImageProbes || probeTimeLeft() <= 0) break outer;
      if (imgSeen.has(img.src) || !/^https?:/.test(img.src)) continue;
      imgSeen.add(img.src);
      probes++;
      await polite();
      const r = await fetcher.fetch(img.src, { method: "HEAD", timeoutMs: 5000 });
      const len = Number(r.headers["content-length"]);
      img.bytes = Number.isFinite(len) && len > 0 ? len : null;
    }
  }

  return {
    seedUrl: seed,
    canonicalHost,
    origin,
    blocked: null,
    pages: [...pages.values()],
    robots,
    sitemap,
    hostProbe,
    linkChecks,
    stats: {
      pagesDiscovered: queued.size,
      pagesCrawled: crawled,
      pagesSkipped: skipped,
      robotsBlocked,
      rateLimited,
      durationMs: Date.now() - started,
      budgetHit,
      totalBytes: fetcher.totalBytes,
      linkChecks: linkChecks.length,
    },
  };
}
