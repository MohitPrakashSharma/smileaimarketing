/**
 * Validation harness: runs the v2 pipeline (crawl → checks → findings → scores)
 * against a live site without touching the database, and writes the full
 * result to a JSON file for manual verification.
 *
 *   npx tsx scripts/validate-audit.ts <url> <out.json> [city] [category] [maxPages]
 */
import { writeFileSync } from "node:fs";
import { Fetcher } from "../lib/audit/core/fetch";
import { crawlSite } from "../lib/audit/core/crawler";
import { buildCheckContext, runChecks } from "../lib/audit/checks";
import { buildFindings } from "../lib/audit/findings/groups";
import { computeScores } from "../lib/audit/scoring";
import { industryFromCategory } from "../lib/industry";

const [url, out, city = "", category = "Local Business", maxPagesArg = "40"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: tsx scripts/validate-audit.ts <url> <out.json> [city] [category] [maxPages]");
  process.exit(1);
}

(async () => {
  const fetcher = new Fetcher();
  const t0 = Date.now();
  const crawl = await crawlSite(fetcher, url, {
    budget: { maxPages: Number(maxPagesArg) },
    onProgress: (e) => {
      process.stderr.write(`  ${e.stage} ${e.pagesCrawled}/${e.pagesDiscovered} ${e.detail ?? ""}\n`);
    },
  });
  const host = new URL(crawl.seedUrl).hostname;
  const ctx = buildCheckContext(crawl, { name: host, city: city || undefined, industry: industryFromCategory(category) }, host);
  const runs = runChecks(ctx);
  const findings = buildFindings(runs, ctx);
  const scores = computeScores(runs, { localRelevant: Boolean(city), searchMeasured: false, measurable: ctx.htmlPages.length > 0 });

  const summary = {
    url,
    seed: crawl.seedUrl,
    canonicalHost: crawl.canonicalHost,
    blocked: crawl.blocked,
    ms: Date.now() - t0,
    stats: crawl.stats,
    robots: { status: crawl.robots.status, blocksAll: crawl.robots.blocksAll, disallow: crawl.robots.disallow.slice(0, 10), sitemaps: crawl.robots.sitemaps },
    sitemap: { found: crawl.sitemap.found, count: crawl.sitemap.urls.length, attempted: crawl.sitemap.attemptedUrls, errors: crawl.sitemap.parseErrors, sitemapCount: crawl.sitemap.sitemapCount },
    hostProbe: {
      http: crawl.hostProbe.httpProbe && { status: crawl.hostProbe.httpProbe.status, final: crawl.hostProbe.httpProbe.finalUrl, chain: crawl.hostProbe.httpProbe.redirectChain, err: crawl.hostProbe.httpProbe.error },
      alt: crawl.hostProbe.altHostProbe && { host: crawl.hostProbe.altHost, status: crawl.hostProbe.altHostProbe.status, final: crawl.hostProbe.altHostProbe.finalUrl, err: crawl.hostProbe.altHostProbe.error },
    },
    scores: { overall: scores.overall, technical: scores.technical.score, content: scores.content.score, techPenalties: scores.technical.penalties, contentPenalties: scores.content.penalties },
    checks: runs.map((r) => ({ id: r.def.id, status: r.outcome.status, severity: r.severity, affected: r.affectedPageCount, share: Math.round(r.pageShare * 100) / 100, reason: r.outcome.reason, detected: r.outcome.detected, sample: r.outcome.affected.slice(0, 6) })),
    findings: findings.map((f) => ({ key: f.findingKey, severity: f.severity, priority: f.priorityScore, pillar: f.pillar, pages: f.affectedPageCount, title: f.title, checkIds: f.checkIds })),
    pages: crawl.pages.map((p) => ({
      url: p.url, final: p.finalUrl, status: p.statusCode, err: p.fetchError, chain: p.redirectChain.length > 1 ? p.redirectChain : undefined, depth: p.depth, via: p.discoveredVia, parent: p.parentUrl, inSitemap: p.inSitemap, ms: p.fetchMs, bytes: p.htmlBytes, indexable: p.indexable,
      title: p.facts?.title, desc: p.facts?.metaDescription?.slice(0, 80), canonical: p.facts?.canonical, robots: p.facts?.robotsMeta, xrobots: p.xRobotsTag, h1: p.facts?.h1, headings: p.facts?.headingCounts, words: p.facts?.wordCount, hash: p.facts?.textHash?.slice(0, 8),
      internal: p.facts?.links.filter((l) => l.internal).length, external: p.facts?.links.filter((l) => !l.internal).length, images: p.facts?.images.length, missingAlt: p.facts?.images.filter((i) => i.alt === null).length, schema: p.facts?.schemaTypes, schemaErr: p.facts?.schemaErrors,
      tel: p.facts?.hasTelLink, form: p.facts?.hasForm, cta: p.facts?.ctaSample, og: p.facts?.ogTagsPresent, viewport: p.facts?.viewport, lang: p.facts?.lang, mixed: p.facts?.mixedContentUrls.length, scripts: p.facts?.externalScriptCount, sample: p.facts?.textSample.slice(0, 100), headers: p.headers,
      linkSample: p.facts?.links.slice(0, 60).map((l) => l.href),
    })),
    linkChecks: crawl.linkChecks.map((l) => ({ url: l.url, status: l.status, ok: l.ok, inconclusive: l.inconclusive, internal: l.internal, err: l.error, from: l.sources.slice(0, 2) })),
  };
  writeFileSync(out, JSON.stringify(summary, null, 1));
  const failed = runs.filter((r) => r.outcome.status === "FAIL");
  console.log(`\n${url}\n  crawled ${crawl.stats.pagesCrawled}/${crawl.stats.pagesDiscovered} discovered, budget=${crawl.stats.budgetHit}, rateLimited=${crawl.stats.rateLimited}, ${Math.round(summary.ms / 1000)}s`);
  console.log(`  sitemap: ${crawl.sitemap.found ? crawl.sitemap.urls.length + " urls" : "none"} | robots: ${crawl.robots.status} | scores: overall ${scores.overall} technical ${scores.technical.score} content ${scores.content.score}`);
  console.log(`  ${failed.length} failing checks, ${findings.length} findings:`);
  for (const f of findings) console.log(`    [${f.severity}] ${f.priorityScore} ${f.title} (${f.affectedPageCount}p) <- ${f.checkIds.join(", ")}`);
  const info = runs.filter((r) => r.outcome.status !== "FAIL" && r.outcome.status !== "PASS");
  if (info.length) console.log(`  info/skipped: ${info.map((r) => `${r.def.id}=${r.outcome.status}(${r.outcome.reason})`).join("; ")}`);
})();
