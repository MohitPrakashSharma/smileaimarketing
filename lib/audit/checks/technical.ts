import { fail, pass, skipped, info, type CheckDefinition, type AffectedPage, type CheckContext } from "./types";
import { isAllowed, parseRobots } from "../core/robots";
import { hostOf, stripWww, isUtilityPath, urlKeyIgnoringTrailingSlash } from "../core/url";
import { looksClientRendered } from "../core/render";

/**
 * Technical SEO checks (report section B). Every outcome cites the exact
 * URLs and values it saw. Weights are the max points each can remove from
 * the Technical pillar (see lib/audit/scoring.ts).
 */

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const TECHNICAL_CHECKS: CheckDefinition[] = [
  // ---------- B1 Crawlability & indexability ----------
  {
    id: "tech.reach.unreachable",
    pillar: "TECHNICAL", section: "B1", title: "Homepage could not be loaded",
    severity: "CRITICAL", weight: 100, impact: 5, effort: 3, confidence: 95, siteWide: true,
    expected: "Homepage responds with HTTP 200 and HTML",
    why: "If the homepage doesn't load, nothing else in this report matters — search engines can't index the site and {customers} can't reach it.",
    fix: "Get the website back online and confirm it loads from a phone on mobile data, not just from inside your office network.",
    developerFix: "Check DNS resolution, TLS certificate validity, hosting status and any firewall/WAF that may be blocking non-browser user agents.",
    run: (ctx) => {
      const home = ctx.crawl.pages.find((p) => p.discoveredVia === "seed");
      if (!home) return skipped("no seed page");
      if (ctx.crawl.blocked) return skipped("site blocked automated access");
      if (home.statusCode === 200 && home.facts) return pass();
      // Our own timeout is inconclusive — the site may simply be slow for our vantage point.
      if (home.fetchError?.startsWith("timed out")) return info(`homepage timed out (${home.fetchError}) — could not be measured`, { redirectChain: home.redirectChain });
      return fail([{ url: home.url, detected: home.fetchError ?? `HTTP ${home.statusCode}`, expected: "HTTP 200 HTML", evidence: { redirectChain: home.redirectChain, contentType: home.contentType } }]);
    },
  },
  {
    id: "tech.reach.blocked",
    pillar: "TECHNICAL", section: "B1", title: "Site refused automated access",
    severity: "LOW", weight: 0, impact: 1, effort: 1, confidence: 99, siteWide: true,
    expected: "Homepage reachable by well-behaved crawlers",
    why: "The site (or its firewall/CDN) answered our crawler with a block page, so nothing about it could be measured. This is not an SEO problem by itself — but if the same rule blocks search engines, pages can drop out of results.",
    fix: "Confirm in Google Search Console that Googlebot can fetch the homepage; if you want this audit run, allow the SmileAIAuditBot user agent or share crawl access.",
    run: (ctx) => (ctx.crawl.blocked ? info(`blocked: ${ctx.crawl.blocked.detail} (${ctx.crawl.blocked.vendor})`, { ...ctx.crawl.blocked }) : pass()),
  },
  {
    id: "tech.reach.timeouts",
    pillar: "TECHNICAL", section: "B1", title: "Pages that timed out",
    severity: "LOW", weight: 0, impact: 2, effort: 3, confidence: 50,
    expected: "Pages respond within 10 seconds",
    why: "These pages didn't finish loading for our crawler within the time limit. That may be a slow server or a temporary blip — it's recorded as inconclusive, not as an error.",
    fix: "If the same pages are slow for you, ask your host about response times on them.",
    run: (ctx) => {
      const t = ctx.crawl.pages.filter((p) => p.fetchError?.startsWith("timed out"));
      return t.length ? info(`${t.length} page(s) timed out — excluded from error checks`, { urls: t.slice(0, 10).map((p) => p.url) }) : pass();
    },
  },
  {
    id: "tech.crawl.rate_limited",
    pillar: "TECHNICAL", section: "B1", title: "Site rate-limited the crawler",
    severity: "LOW", weight: 0, impact: 1, effort: 1, confidence: 99, siteWide: true,
    expected: "Crawlers can fetch pages at a modest rate without 429 responses",
    why: "The site answered some requests with HTTP 429 (too many requests). We slowed down and excluded those pages from error checks, but aggressive throttling can also limit how much of the site Google crawls.",
    fix: "If your host or firewall rate-limits bots aggressively, ask them to allow known search engine crawlers.",
    run: (ctx) => (ctx.crawl.stats.rateLimited > 0 ? info(`${ctx.crawl.stats.rateLimited} request(s) answered with 429/503 — those pages were excluded from broken-page checks`, { rateLimited: ctx.crawl.stats.rateLimited }) : pass()),
  },
  {
    id: "tech.robots.missing",
    pillar: "TECHNICAL", section: "B1", title: "robots.txt is missing",
    severity: "LOW", weight: 4, impact: 2, effort: 1, confidence: 95, siteWide: true,
    expected: "/robots.txt returns 200 with at least a Sitemap: line",
    why: "A missing robots.txt isn't fatal, but it's the first file every crawler asks for and the standard place to point search engines at your sitemap.",
    fix: "Add a robots.txt file that allows crawling and lists your sitemap.",
    developerFix: "Serve /robots.txt (text/plain):\nUser-agent: *\nAllow: /\nSitemap: https://{host}/sitemap.xml",
    run: (ctx) =>
      ctx.crawl.robots.status === null
        ? info("robots.txt could not be fetched (network/timeout) — inconclusive")
        : ctx.crawl.robots.status === 200
          ? pass()
          : fail([{ url: `${ctx.crawl.origin}/robots.txt`, detected: `HTTP ${ctx.crawl.robots.status}`, expected: "HTTP 200" }]),
  },
  {
    id: "tech.robots.blocks_all",
    pillar: "TECHNICAL", section: "B1", title: "robots.txt blocks all crawling",
    severity: "CRITICAL", weight: 60, impact: 5, effort: 1, confidence: 98, siteWide: true,
    expected: "robots.txt does not contain `Disallow: /` for all user agents",
    why: "The site is telling Google not to crawl anything. Pages can drop out of search entirely.",
    fix: "Remove the blanket Disallow rule from robots.txt.",
    developerFix: "Replace `Disallow: /` under `User-agent: *` with `Allow: /` (keep specific disallows for admin paths only).",
    run: (ctx) => (ctx.crawl.robots.blocksAll ? fail([{ url: `${ctx.crawl.origin}/robots.txt`, detected: "Disallow: /", expected: "Allow: /", evidence: { disallow: ctx.crawl.robots.disallow } }]) : pass()),
  },
  {
    id: "tech.robots.blocks_important",
    pillar: "TECHNICAL", section: "B1", title: "robots.txt blocks important pages",
    severity: "HIGH", weight: 20, impact: 4, effort: 1, confidence: 90,
    expected: "Key pages (homepage, top-level pages, sitemap URLs) are allowed",
    why: "Pages blocked in robots.txt can't be crawled, so their content never counts for ranking.",
    fix: "Allow crawling of your service and landing pages; only block admin and utility paths.",
    developerFix: "Remove or narrow the matching Disallow rule; verify with Google Search Console's robots.txt tester.",
    run: (ctx) => {
      if (!ctx.crawl.robots.body) return skipped("no robots.txt");
      const rules = parseRobots(ctx.crawl.robots.body);
      if (rules.unrestricted) return pass();
      const blocked = ctx.crawl.pages.filter((p) => p.fetchError === "blocked by robots.txt" && ((p.depth !== null && p.depth <= 1) || p.inSitemap));
      return fail(blocked.map((p) => ({ url: p.url, detected: "blocked by robots.txt", expected: "allowed", evidence: { rule: rules.disallow.find((d) => !isAllowed({ ...rules, allow: [] }, p.url) && d) } })));
    },
  },
  {
    id: "tech.sitemap.missing",
    pillar: "TECHNICAL", section: "B1", title: "No XML sitemap found",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 92, siteWide: true,
    expected: "A valid sitemap at /sitemap.xml (or referenced from robots.txt)",
    why: "A sitemap is how you hand search engines a complete list of pages. Without it, deeper pages are discovered slowly or not at all.",
    fix: "Publish an XML sitemap and reference it in robots.txt. Most CMS platforms (WordPress, Shopify, Wix) can generate one automatically.",
    developerFix: "Generate /sitemap.xml listing every indexable URL with <lastmod>; add `Sitemap: https://{host}/sitemap.xml` to robots.txt; submit in Search Console.",
    run: (ctx) =>
      ctx.crawl.sitemap.found
        ? pass()
        : !ctx.crawl.sitemap.reachable
          ? info("sitemap locations could not be fetched (network/timeout) — inconclusive", { attempted: ctx.crawl.sitemap.attemptedUrls })
          : fail([{ url: `${ctx.crawl.origin}/sitemap.xml`, detected: "not found", expected: "200 XML sitemap", evidence: { attempted: ctx.crawl.sitemap.attemptedUrls } }]),
  },
  {
    id: "tech.sitemap.invalid",
    pillar: "TECHNICAL", section: "B1", title: "Sitemap has errors",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 2, confidence: 85, siteWide: true,
    expected: "Sitemap parses as XML with <urlset>/<sitemapindex> and <loc> entries",
    why: "A sitemap that doesn't parse is ignored, so you get none of the benefit while believing you're covered.",
    fix: "Regenerate the sitemap with your CMS or a sitemap tool and re-submit it.",
    developerFix: "Ensure the response is `application/xml`, well-formed, and each <url> has a <loc>. Validate in Search Console → Sitemaps.",
    run: (ctx) => (ctx.crawl.sitemap.parseErrors.length ? fail(ctx.crawl.sitemap.parseErrors.map((e) => ({ url: e.split(" ")[0], detected: e, expected: "valid XML sitemap" }))) : pass()),
  },
  {
    id: "tech.sitemap.stale_urls",
    pillar: "TECHNICAL", section: "B1", title: "Sitemap lists broken or redirected URLs",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 2, confidence: 95,
    expected: "Every sitemap URL returns 200 without redirecting",
    why: "Search engines lose trust in a sitemap full of dead or redirecting URLs and stop using it to prioritise your real pages.",
    fix: "Remove deleted pages from the sitemap and list the final URL of any page that now redirects.",
    developerFix: "Filter the sitemap generator to status-200, canonical URLs only; exclude noindex pages.",
    run: (ctx) => {
      const smPages = ctx.crawl.pages.filter((p) => p.inSitemap);
      if (!smPages.length) return skipped("no sitemap URLs crawled");
      const bad = smPages.filter((p) => !p.fetchError?.startsWith("rate limited") && ((p.statusCode !== null && p.statusCode >= 400) || (p.finalUrl && p.finalUrl !== p.url) || (p.statusCode === 200 && p.indexable === false)));
      return fail(bad.map((p) => ({ url: p.url, detected: p.statusCode && p.statusCode >= 400 ? `HTTP ${p.statusCode}` : p.finalUrl && p.finalUrl !== p.url ? `redirects to ${p.finalUrl}` : "noindex / non-canonical", expected: "200, indexable, self-canonical" })));
    },
  },
  {
    id: "tech.index.noindex_important",
    pillar: "TECHNICAL", section: "B1", title: "Important pages are set to noindex",
    severity: "CRITICAL", weight: 40, impact: 5, effort: 1, confidence: 98,
    expected: "Homepage and top-level pages are indexable (no noindex meta or X-Robots-Tag)",
    why: "A noindex tag removes the page from Google entirely, no matter how good it is. On a homepage or service page this is usually a leftover from development.",
    fix: "Remove the noindex setting from your main pages (often a 'Discourage search engines' checkbox in the CMS).",
    developerFix: "Delete `<meta name=\"robots\" content=\"noindex\">` / the `X-Robots-Tag: noindex` header on the listed URLs; in WordPress check Settings → Reading.",
    run: (ctx) => {
      const affected = ctx.htmlPages.filter((p) => ((p.depth !== null && p.depth <= 1) || p.inSitemap) && !isUtilityPath(p.url) && /\bnoindex\b|\bnone\b/.test(`${p.facts?.robotsMeta ?? ""} ${p.xRobotsTag ?? ""}`.toLowerCase()));
      return fail(affected.map((p) => ({ url: p.url, detected: p.facts?.robotsMeta ?? p.xRobotsTag ?? "noindex", expected: "index,follow (or no robots directive)", evidence: { robotsMeta: p.facts?.robotsMeta, xRobotsTag: p.xRobotsTag } })));
    },
  },
  {
    id: "tech.index.canonical_missing",
    pillar: "TECHNICAL", section: "B1", title: "Pages without a canonical tag",
    severity: "LOW", weight: 5, impact: 2, effort: 2, confidence: 95,
    expected: "Each indexable page declares a self-referencing <link rel=\"canonical\">",
    why: "Without a canonical tag, URL variants (with/without www, trailing slash, tracking parameters) can be indexed as separate duplicate pages, splitting your ranking signals.",
    fix: "Have each page declare itself as the preferred version. Most SEO plugins do this automatically.",
    developerFix: "Add `<link rel=\"canonical\" href=\"<absolute URL of this page>\">` in <head> for every indexable page.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.statusCode === 200 && !p.facts?.canonical && !/\bnoindex\b/.test(p.facts?.robotsMeta ?? "")).map((p) => ({ url: p.url, detected: "no canonical", expected: p.url }))),
  },
  {
    id: "tech.index.canonical_mismatch",
    pillar: "TECHNICAL", section: "B1", title: "Canonical points to a different URL",
    severity: "HIGH", weight: 15, impact: 4, effort: 2, confidence: 90,
    expected: "Canonical equals the page's own final URL (except deliberate duplicates)",
    why: "A canonical pointing elsewhere tells Google 'index that other page instead of me'. On a real service page this silently removes it from search.",
    fix: "Make sure each main page's canonical points to itself, not to the homepage or a staging domain.",
    developerFix: "Fix the canonical href on the listed pages; common causes: hardcoded homepage canonical in the theme header, http vs https, staging hostname.",
    run: (ctx) => {
      const affected = ctx.htmlPages.filter((p) => p.statusCode === 200 && p.facts?.canonical && p.facts.canonical !== (p.finalUrl ?? p.url) && !isUtilityPath(p.url) && urlKeyIgnoringTrailingSlash(p.facts.canonical) !== urlKeyIgnoringTrailingSlash(p.finalUrl ?? p.url));
      return fail(affected.map((p) => ({ url: p.url, detected: p.facts!.canonical!, expected: p.finalUrl ?? p.url, evidence: { crossHost: hostOf(p.facts!.canonical!) !== hostOf(p.url) } })));
    },
  },
  {
    id: "tech.index.canonical_non_https",
    pillar: "TECHNICAL", section: "B1", title: "Canonical uses http:// on an https page",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 98,
    expected: "Canonical URLs use https://",
    why: "An http canonical on an https page points Google at the insecure version and can keep the http URL in the index.",
    fix: "Update canonical URLs to https.",
    developerFix: "Set the site URL / canonical base to https in the CMS or theme so generated canonicals use the secure scheme.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.isHttps && p.facts?.canonical?.startsWith("http://")).map((p) => ({ url: p.url, detected: p.facts!.canonical!, expected: p.facts!.canonical!.replace(/^http:/, "https:") }))),
  },
  {
    id: "tech.status.4xx",
    pillar: "TECHNICAL", section: "B1", title: "Crawled pages return 4xx errors",
    severity: "HIGH", weight: 15, impact: 4, effort: 2, confidence: 98,
    expected: "Linked and sitemap pages return 200",
    why: "Every internal link to a 404 wastes crawl budget and sends a {customer} to a dead end.",
    fix: "Fix or remove links to pages that no longer exist; redirect deleted pages to their closest replacement.",
    developerFix: "301-redirect each listed URL to its replacement, or restore the page; update the internal links that point to it (see parentUrl in evidence).",
    run: (ctx) => fail(ctx.crawl.pages.filter((p) => p.statusCode !== null && p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 429).map((p) => ({ url: p.url, detected: `HTTP ${p.statusCode}`, expected: "HTTP 200", evidence: { linkedFrom: p.parentUrl, inSitemap: p.inSitemap } }))),
  },
  {
    id: "tech.status.soft_404",
    pillar: "TECHNICAL", section: "B1", title: "Error pages served with HTTP 200 (soft 404s)",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 2, confidence: 70,
    expected: "Missing pages return HTTP 404/410, not a 200 'not found' page",
    why: "A 'page not found' message delivered with a 200 status tells search engines the page exists and should be indexed — they waste crawl budget on it and may show it in results.",
    fix: "Make missing pages return a real 404 status.",
    developerFix: "Configure the CMS/server so the not-found template responds with HTTP 404; check any catch-all route that returns 200.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts?.looksLikeErrorPage).map((p) => ({ url: p.url, detected: `HTTP 200 with title "${p.facts!.title ?? ""}" (${p.facts!.bodyWordCount} words)`, expected: "HTTP 404" }))),
  },
  {
    id: "tech.status.5xx",
    pillar: "TECHNICAL", section: "B1", title: "Server errors (5xx)",
    severity: "CRITICAL", weight: 30, impact: 5, effort: 3, confidence: 95,
    expected: "No server errors or timeouts on crawled pages",
    why: "Server errors mean the page failed for us and will fail for Google and for {customers}. Repeated 5xx responses get pages dropped from the index.",
    fix: "Ask your host or developer to investigate server errors on the listed pages.",
    developerFix: "Check application/server logs for the listed URLs; look for PHP fatals, DB timeouts, memory limits or misconfigured rewrites.",
    run: (ctx) => fail(ctx.crawl.pages.filter((p) => p.statusCode !== null && p.statusCode >= 500 && !p.fetchError?.startsWith("rate limited")).map((p) => ({ url: p.url, detected: `HTTP ${p.statusCode}`, expected: "HTTP 200" }))),
  },
  {
    id: "tech.links.broken_internal",
    pillar: "TECHNICAL", section: "B1", title: "Broken internal links",
    severity: "HIGH", weight: 12, impact: 4, effort: 2, confidence: 95,
    expected: "Internal links resolve to 200 pages",
    why: "Broken internal links leak authority and frustrate visitors — and they're one of the easiest things to fix.",
    fix: "Update or remove the broken links listed here.",
    developerFix: "For each target URL, either restore/redirect it or edit the source pages (listed in evidence) to point at the right page.",
    run: (ctx) => fail(ctx.crawl.linkChecks.filter((l) => l.internal && !l.ok).map((l) => ({ url: l.url, detected: l.status ? `HTTP ${l.status}${l.finalUrl && l.finalUrl !== l.url ? ` (after redirect to ${l.finalUrl})` : ""}` : (l.error ?? "unreachable"), expected: "HTTP 200", evidence: { linkedFrom: l.sources, finalUrl: l.finalUrl ?? null } }))),
  },
  {
    id: "tech.links.broken_external",
    pillar: "TECHNICAL", section: "B1", title: "Broken outbound links",
    severity: "LOW", weight: 3, impact: 2, effort: 1, confidence: 80,
    expected: "Outbound links resolve",
    why: "Dead outbound links make a site look unmaintained. Low priority, but cheap to fix.",
    fix: "Update or remove the outbound links listed here.",
    run: (ctx) => fail(ctx.crawl.linkChecks.filter((l) => !l.internal && !l.ok && l.status !== null && l.status !== 403 && l.status !== 429).map((l) => ({ url: l.url, detected: `HTTP ${l.status}`, expected: "HTTP 200", evidence: { linkedFrom: l.sources } }))),
  },
  {
    id: "tech.redirect.chain",
    pillar: "TECHNICAL", section: "B1", title: "Redirect chains",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 2, confidence: 98,
    expected: "At most one redirect hop between a linked URL and its final page",
    why: "Each extra redirect hop adds latency for visitors and dilutes the ranking signal passed along the chain.",
    fix: "Point links and redirects straight to the final URL.",
    developerFix: "Collapse the chain: make the first URL 301 directly to the last URL in the chain shown in evidence.",
    run: (ctx) => fail(ctx.crawl.pages.filter((p) => p.redirectChain.length > 2).map((p) => ({ url: p.url, detected: `${p.redirectChain.length - 1} hops`, expected: "≤ 1 hop", evidence: { chain: p.redirectChain } }))),
  },
  {
    id: "tech.redirect.internal_links_redirect",
    pillar: "TECHNICAL", section: "B1", title: "Internal links point to redirecting URLs",
    severity: "LOW", weight: 4, impact: 2, effort: 2, confidence: 95,
    expected: "Internal links point directly at the final URL",
    why: "Linking to a URL that redirects works, but every visit pays the redirect cost and search engines have to resolve it each time.",
    fix: "Update internal links to the final destination URL.",
    run: (ctx) => fail(ctx.crawl.pages.filter((p) => p.discoveredVia === "link" && p.finalUrl && p.finalUrl !== p.url && p.statusCode === 200).map((p) => ({ url: p.url, detected: `→ ${p.finalUrl}`, expected: p.finalUrl!, evidence: { linkedFrom: p.parentUrl } }))),
  },
  {
    id: "tech.arch.depth_gt3",
    pillar: "TECHNICAL", section: "B2", title: "Pages more than 3 clicks from the homepage",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 3, confidence: 85,
    expected: "Important pages reachable within 3 clicks",
    why: "Pages buried deep in the site are crawled less often and given less weight — they look unimportant to search engines.",
    fix: "Link to your key pages from the main navigation, footer or homepage.",
    run: (ctx) => {
      if (ctx.crawl.stats.budgetHit !== "none") return skipped("crawl budget hit — link graph incomplete, depth unreliable");
      return fail(ctx.indexablePages.filter((p) => p.depth !== null && p.depth > 3).map((p) => ({ url: p.url, detected: `depth ${p.depth}`, expected: "depth ≤ 3", evidence: { parent: p.parentUrl } })));
    },
  },
  {
    id: "tech.arch.orphan_in_sitemap",
    pillar: "TECHNICAL", section: "B2", title: "Sitemap pages with no internal links to them",
    severity: "LOW", weight: 5, impact: 2, effort: 3, confidence: 70,
    expected: "Every sitemap page is linked from at least one crawled page",
    why: "A page only reachable via the sitemap gets almost no ranking signal from the rest of your site.",
    fix: "Add links to these pages from related content or the navigation.",
    run: (ctx) => {
      if (!ctx.crawl.sitemap.found) return skipped("no sitemap");
      if (ctx.crawl.stats.budgetHit !== "none") return skipped("crawl budget hit — link graph incomplete");
      const linked = new Set<string>();
      for (const p of ctx.htmlPages) for (const l of p.facts?.links ?? []) if (l.internal) linked.add(l.href);
      return fail(ctx.crawl.pages.filter((p) => p.inSitemap && p.discoveredVia === "sitemap" && p.statusCode === 200 && !linked.has(p.url) && !linked.has(p.finalUrl ?? "")).map((p) => ({ url: p.url, detected: "0 internal links", expected: "≥ 1 internal link" })));
    },
  },
  {
    id: "tech.url.hygiene",
    pillar: "TECHNICAL", section: "B2", title: "Messy URLs (uppercase, parameters, very long)",
    severity: "LOW", weight: 4, impact: 2, effort: 3, confidence: 90,
    expected: "Lowercase, hyphenated, parameter-free URLs under ~100 characters",
    why: "Clean URLs are easier to share, less likely to create duplicates, and hint at the page topic.",
    fix: "Prefer short lowercase URLs with hyphens; avoid query parameters for real pages.",
    run: (ctx) => fail(ctx.indexablePages.filter((p) => { const u = new URL(p.url); return /[A-Z]/.test(u.pathname) || u.search.length > 0 || u.pathname.length > 100 || /_/.test(u.pathname); }).map((p) => { const u = new URL(p.url); const issues = [/[A-Z]/.test(u.pathname) && "uppercase", u.search && "query parameters", u.pathname.length > 100 && "over 100 chars", /_/.test(u.pathname) && "underscores"].filter(Boolean); return { url: p.url, detected: issues.join(", "), expected: "clean lowercase path" }; })),
  },
  {
    id: "tech.duplicate.url_variants",
    pillar: "TECHNICAL", section: "B1", title: "Same page served at multiple URLs without canonical",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 2, confidence: 90,
    expected: "URL variants redirect or canonicalise to one URL",
    why: "When the same content is available at several URLs with no canonical, Google may index the wrong one or split ranking between them.",
    fix: "Pick one URL format and redirect or canonicalise the others to it.",
    developerFix: "Add self-canonicals and 301 the variants (trailing slash, index.html, http, www) to the preferred form.",
    run: (ctx) => {
      const byHash = new Map<string, typeof ctx.htmlPages>();
      for (const p of ctx.htmlPages) {
        if (!p.facts || p.facts.wordCount < 30 || p.facts.canonical) continue;
        const arr = byHash.get(p.facts.textHash) ?? [];
        arr.push(p);
        byHash.set(p.facts.textHash, arr);
      }
      const affected: AffectedPage[] = [];
      for (const group of byHash.values()) if (group.length > 1) for (const p of group) affected.push({ url: p.url, detected: `identical to ${group.filter((g) => g !== p).map((g) => g.url).join(", ")}`, expected: "canonical or redirect to one URL" });
      return fail(affected);
    },
  },
  {
    id: "tech.host.www_inconsistent",
    pillar: "TECHNICAL", section: "B5", title: "www and non-www both serve the site",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 90, siteWide: true,
    expected: "One host version 301-redirects to the other",
    why: "Two live hostnames means two copies of every page. Search engines and backlinks get split between them.",
    fix: "Choose www or non-www and redirect the other permanently.",
    developerFix: "Add a host-level 301 (e.g. in the web server, Cloudflare rule or hosting panel) from the non-preferred host to the preferred one.",
    run: (ctx) => {
      const probe = ctx.crawl.hostProbe.altHostProbe;
      if (!probe || probe.status === null) return skipped("alternate host did not respond");
      const canonical = ctx.crawl.canonicalHost;
      const landedHost = hostOf(probe.finalUrl);
      if (landedHost && stripWww(landedHost) === stripWww(canonical) && landedHost === canonical) return pass(); // twin redirects to the canonical host
      if (probe.status === 200 && landedHost === ctx.crawl.hostProbe.altHost) return fail([{ url: probe.url, detected: `HTTP 200 on ${ctx.crawl.hostProbe.altHost} (no redirect)`, expected: `301 → ${canonical}`, evidence: { chain: probe.redirectChain } }]);
      return pass();
    },
  },
  // ---------- B5 Security ----------
  {
    id: "tech.https.missing",
    pillar: "TECHNICAL", section: "B5", title: "Pages served over HTTP",
    severity: "CRITICAL", weight: 40, impact: 5, effort: 2, confidence: 99,
    expected: "All pages served over HTTPS",
    why: "Browsers label HTTP pages 'Not secure', Google uses HTTPS as a ranking signal, and forms on HTTP pages expose {customer} data.",
    fix: "Install an SSL certificate (usually free via your host or Let's Encrypt) and serve the whole site over https://.",
    developerFix: "Provision TLS, set the CMS site URL to https, and 301 all http:// requests to https://.",
    run: (ctx) => fail(ctx.crawl.pages.filter((p) => p.statusCode === 200 && !p.isHttps).map((p) => ({ url: p.finalUrl ?? p.url, detected: "http://", expected: "https://" }))),
  },
  {
    id: "tech.https.no_redirect",
    pillar: "TECHNICAL", section: "B5", title: "http:// does not redirect to https://",
    severity: "HIGH", weight: 15, impact: 4, effort: 1, confidence: 95, siteWide: true,
    expected: "http://{host}/ responds 301 → https://{host}/",
    why: "If the insecure address still serves the site, old links and typed addresses land visitors on the 'Not secure' version and create a full duplicate site.",
    fix: "Redirect all http traffic to https permanently.",
    developerFix: "Add a server-level 301 from http://* to https://*; enable HSTS once verified.",
    run: (ctx) => {
      const probe = ctx.crawl.hostProbe.httpProbe;
      if (!probe) return skipped("site is not https");
      if (probe.status === null) return info("http:// did not respond (port 80 closed) — acceptable", { error: probe.error });
      if (probe.finalUrl.startsWith("https://")) return pass();
      return fail([{ url: probe.url, detected: `HTTP ${probe.status} served over http`, expected: "301 → https", evidence: { chain: probe.redirectChain } }]);
    },
  },
  {
    id: "tech.https.mixed_content",
    pillar: "TECHNICAL", section: "B5", title: "Mixed content (http assets on https pages)",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 2, confidence: 95,
    expected: "All scripts, images and stylesheets load over https",
    why: "Browsers block or warn about insecure assets on secure pages — broken images, missing scripts, and a 'Not secure' warning.",
    fix: "Update asset URLs to https (a search-and-replace in the CMS usually fixes it).",
    developerFix: "Replace http:// asset URLs (listed in evidence) with https:// or protocol-relative paths; run a DB search-replace for legacy content.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts?.mixedContentUrls.length).map((p) => ({ url: p.url, detected: `${p.facts!.mixedContentUrls.length} http asset(s)`, expected: "0", evidence: { assets: p.facts!.mixedContentUrls.slice(0, 5) } }))),
  },
  {
    id: "tech.security.hsts_missing",
    pillar: "TECHNICAL", section: "B5", title: "HSTS header not set",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 98, siteWide: true,
    expected: "Strict-Transport-Security header present on https responses",
    why: "HSTS tells browsers to always use https for your domain, closing the window where a visitor could be served the insecure version.",
    fix: "Ask your host/developer to enable HSTS.",
    developerFix: "Send `Strict-Transport-Security: max-age=31536000; includeSubDomains` on https responses once the http→https redirect is confirmed.",
    run: (ctx) => (!ctx.homepage || !ctx.homepage.isHttps ? skipped("not https") : ctx.homepage.headers["strict-transport-security"] ? pass() : fail([{ url: ctx.homepage.url, detected: "header absent", expected: "max-age ≥ 31536000" }])),
  },
  {
    id: "tech.security.headers",
    pillar: "TECHNICAL", section: "B5", title: "Basic security headers missing",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 98, siteWide: true,
    expected: "X-Content-Type-Options and X-Frame-Options (or CSP frame-ancestors) set",
    why: "These headers don't affect ranking directly but are cheap hardening that security scanners and some procurement checks look for.",
    fix: "Ask your host/developer to add standard security headers.",
    developerFix: "Add `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` (or `Content-Security-Policy: frame-ancestors 'self'`).",
    run: (ctx) => {
      if (!ctx.homepage) return skipped("no homepage");
      const h = ctx.homepage.headers;
      const missing = [!h["x-content-type-options"] && "X-Content-Type-Options", !h["x-frame-options"] && !/frame-ancestors/i.test(h["content-security-policy"] ?? "") && "X-Frame-Options/CSP frame-ancestors"].filter(Boolean) as string[];
      return missing.length ? fail([{ url: ctx.homepage.url, detected: `missing: ${missing.join(", ")}`, expected: "both present" }]) : pass();
    },
  },
  // ---------- B3 Performance (crawler-observable only in Phase 1) ----------
  {
    id: "tech.perf.ttfb_slow",
    pillar: "TECHNICAL", section: "B3", title: "Slow server response time (TTFB)",
    severity: "MEDIUM", weight: 10, impact: 3, effort: 3, confidence: 70,
    expected: "Median time-to-first-byte under 800 ms (measured from our server; field data comes in Phase 2)",
    why: "Slow server responses delay everything else on the page. Google's guidance is under 800 ms to first byte.",
    fix: "Enable page caching on your hosting/CMS or move to a faster host.",
    developerFix: "Add full-page caching (or a CDN in front), enable compression, and check slow database queries on the listed pages.",
    run: (ctx) => {
      const timed = ctx.htmlPages.filter((p) => p.ttfbMs !== null);
      if (timed.length < 2) return skipped("not enough timed pages");
      const med = median(timed.map((p) => p.ttfbMs!));
      if (med <= 800) return pass();
      return fail(timed.filter((p) => p.ttfbMs! > 800).map((p) => ({ url: p.url, detected: `${p.ttfbMs} ms to first byte`, expected: "< 800 ms" })), { detected: `median ${med} ms`, expected: "< 800 ms", evidence: { medianTtfbMs: med, sample: timed.length } });
    },
  },
  {
    id: "tech.perf.html_weight",
    pillar: "TECHNICAL", section: "B3", title: "Very large HTML documents",
    severity: "LOW", weight: 4, impact: 2, effort: 3, confidence: 90,
    expected: "HTML under 500 KB",
    why: "Huge HTML (usually inlined CSS/JS or page-builder bloat) slows every visit and can hit crawler limits.",
    fix: "Ask your developer to trim inline code and page-builder bloat.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => (p.htmlBytes ?? 0) > 500 * 1024).map((p) => ({ url: p.url, detected: `${Math.round(p.htmlBytes! / 1024)} KB`, expected: "< 500 KB" }))),
  },
  // ---------- B4 Mobile & HTML basics ----------
  {
    id: "tech.mobile.viewport_missing",
    pillar: "TECHNICAL", section: "B4", title: "Missing mobile viewport tag",
    severity: "CRITICAL", weight: 30, impact: 5, effort: 1, confidence: 98,
    expected: "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> on every page",
    why: "Without a viewport tag, phones render the desktop layout shrunk down. Google indexes the mobile version of your site first, so mobile problems affect how every page is assessed.",
    fix: "Add the standard mobile viewport tag to your site template.",
    developerFix: "Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` to the <head> in the base template.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && !p.facts.viewport).map((p) => ({ url: p.url, detected: "no viewport meta", expected: "width=device-width, initial-scale=1" }))),
  },
  {
    id: "tech.html.lang_missing",
    pillar: "TECHNICAL", section: "B4", title: "Missing <html lang> attribute",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 98,
    expected: "<html lang=\"en\"> (or the page language)",
    why: "The lang attribute helps search engines serve the page to the right audience and helps screen readers pronounce it correctly.",
    fix: "Set the page language in your site template.",
    developerFix: "Add `lang=\"en\"` (or the correct code) to the <html> element in the base template.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && !p.facts.lang).map((p) => ({ url: p.url, detected: "no lang attribute", expected: "lang=\"en\"" }))),
  },
  {
    id: "tech.html.basics",
    pillar: "TECHNICAL", section: "B4", title: "Missing doctype or charset",
    severity: "LOW", weight: 2, impact: 1, effort: 1, confidence: 98,
    expected: "<!DOCTYPE html> and <meta charset=\"utf-8\">",
    why: "Missing basics push browsers into quirks mode and can garble special characters.",
    fix: "Ask your developer to add the standard doctype and charset declarations.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && (!p.facts.hasDoctype || !p.facts.charset)).map((p) => ({ url: p.url, detected: [!p.facts!.hasDoctype && "no doctype", !p.facts!.charset && "no charset"].filter(Boolean).join(", "), expected: "doctype + charset" }))),
  },
  {
    id: "tech.render.js_only",
    pillar: "TECHNICAL", section: "B4", title: "Pages appear to render only with JavaScript",
    severity: "HIGH", weight: 20, impact: 4, effort: 4, confidence: 60,
    expected: "Core content present in the HTML response",
    why: "We received almost no text for these pages — the content is likely injected by JavaScript. Google can render JS, but slowly and unreliably; other crawlers and previews see an empty page.",
    fix: "Ask your developer to server-render or pre-render the main content.",
    developerFix: "Enable SSR/SSG or a pre-rendering service for these routes so the initial HTML contains title, headings and body text.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && !isUtilityPath(p.url) && looksClientRendered(p.facts)).map((p) => ({ url: p.url, detected: `${p.facts!.bodyWordCount} words in the HTML, ${p.facts!.externalScriptCount} scripts${p.facts!.spaRootEmpty ? ", empty app mount point" : ""}`, expected: "server-rendered title, headings and body text" }))),
  },
  // ---------- B6 Structured data ----------
  {
    id: "tech.schema.none",
    pillar: "TECHNICAL", section: "B6", title: "No structured data (schema.org) found",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 2, confidence: 95, siteWide: true,
    expected: "JSON-LD for Organization/LocalBusiness on the homepage",
    why: "Structured data lets Google show rich results (ratings, hours, FAQs) and understand what the business is. Competitors with it look richer in search.",
    fix: "Add Organization or LocalBusiness structured data to the homepage (most SEO plugins can generate it).",
    developerFix: "Add a JSON-LD <script type=\"application/ld+json\"> with @type LocalBusiness (or a subtype), name, url, telephone, address and openingHours.",
    run: (ctx) => (!ctx.homepage?.facts ? skipped("no homepage") : ctx.htmlPages.some((p) => p.facts?.schemaTypes.length) ? pass() : fail([{ url: ctx.homepage.url, detected: "no JSON-LD / microdata", expected: "LocalBusiness or Organization JSON-LD" }])),
  },
  {
    id: "tech.schema.invalid_json",
    pillar: "TECHNICAL", section: "B6", title: "Structured data that doesn't parse",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 1, confidence: 98,
    expected: "Every ld+json block is valid JSON",
    why: "A JSON-LD block with a syntax error is ignored entirely — you get none of the rich-result benefit.",
    fix: "Ask your developer to fix the structured data syntax.",
    developerFix: "Validate each ld+json block on the listed pages with Google's Rich Results Test; usual culprits: trailing commas, unescaped quotes.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && p.facts.schemaErrors > 0).map((p) => ({ url: p.url, detected: `${p.facts!.schemaErrors} invalid block(s)`, expected: "0" }))),
  },
  {
    id: "tech.schema.missing_localbusiness",
    pillar: "TECHNICAL", section: "B6", title: "No LocalBusiness/Organization schema on the homepage",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 2, confidence: 90, siteWide: true,
    expected: "Homepage declares LocalBusiness (or a subtype) or Organization",
    why: "For a local {business}, LocalBusiness schema is how you tell Google your name, address, phone and hours in a machine-readable way.",
    fix: "Add LocalBusiness structured data with your name, address, phone and opening hours.",
    developerFix: "Add JSON-LD: { \"@context\":\"https://schema.org\", \"@type\":\"LocalBusiness\", \"name\", \"url\", \"telephone\", \"address\": {PostalAddress}, \"openingHoursSpecification\" }.",
    run: (ctx) => {
      if (!ctx.business.hasLocation) return skipped("no physical location detected");
      if (!ctx.homepage?.facts) return skipped("no homepage");
      const types = ctx.homepage.facts.schemaTypes.map((t) => t.toLowerCase());
      if (!types.length) return skipped("covered by tech.schema.none");
      return /localbusiness|organization|dentist|physician|store|restaurant|attorney|legalservice|plumber|electrician|hvacbusiness|roofingcontractor|autorepair|beautysalon|hairsalon|realestateagent|medicalbusiness|professionalservice|homeandconstructionbusiness|foodestablishment|lodgingbusiness/i.test(types.join(" ")) ? pass() : fail([{ url: ctx.homepage.url, detected: types.join(", "), expected: "LocalBusiness / Organization" }]);
    },
  },
];

export default TECHNICAL_CHECKS;
export type { CheckContext };
