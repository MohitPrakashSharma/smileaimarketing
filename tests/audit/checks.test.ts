import { SEVERITY_ORDER } from "@/lib/audit/priority";
import { describe, it, expect, beforeAll } from "vitest";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { buildCheckContext, runChecks, ALL_CHECKS } from "@/lib/audit/checks";
import type { CheckRun } from "@/lib/audit/checks/types";
import { buildFindings, type Finding } from "@/lib/audit/findings/groups";
import { computeScores } from "@/lib/audit/scoring";
import { industryFromCategory } from "@/lib/industry";
import { makeFetch, testResolver, ALL_SITES } from "../fixtures/sites";

async function audit(url: string, opts: { city?: string; category?: string } = {}) {
  const { fetchImpl } = makeFetch(ALL_SITES);
  const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), url, { budget: { concurrency: 2 } });
  const host = new URL(crawl.seedUrl).hostname;
  const ctx = buildCheckContext(crawl, { name: "Test Co", city: opts.city ?? "Toronto", industry: industryFromCategory(opts.category ?? "Plumbing Company") }, host);
  const runs = runChecks(ctx);
  const findings = buildFindings(runs, ctx);
  const scores = computeScores(runs, { localRelevant: true, searchMeasured: false, measurable: ctx.htmlPages.length > 0 });
  return { crawl, ctx, runs, findings, scores };
}

const failed = (runs: CheckRun[]) => runs.filter((r) => r.outcome.status === "FAIL").map((r) => r.def.id).sort();
const byId = (runs: CheckRun[], id: string) => runs.find((r) => r.def.id === id)!;
const findingByKey = (f: Finding[], key: string) => f.find((x) => x.findingKey === key);

describe("check registry", () => {
  it("has unique ids, valid metadata and no AI imports", () => {
    const ids = ALL_CHECKS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ALL_CHECKS) {
      expect(c.weight).toBeGreaterThanOrEqual(0); // 0 only for INFO-style checks that never penalise
      expect(c.confidence).toBeGreaterThan(0);
      expect(c.why.length).toBeGreaterThan(20);
      expect(c.fix.length).toBeGreaterThan(10);
    }
    expect(ids.length).toBeGreaterThanOrEqual(50);
  });
});

describe("healthy site", () => {
  let a: Awaited<ReturnType<typeof audit>>;
  beforeAll(async () => {
    a = await audit("https://healthy.test");
  });
  it("passes almost everything and scores high", () => {
    const fails = failed(a.runs);
    expect(fails).not.toContain("tech.https.missing");
    expect(fails).not.toContain("content.title.missing");
    expect(fails).not.toContain("content.h1.missing");
    expect(fails).not.toContain("tech.mobile.viewport_missing");
    expect(fails).not.toContain("tech.sitemap.missing");
    expect(fails).not.toContain("content.trust.no_contact_page");
    expect(fails).not.toContain("tech.host.www_inconsistent");
    expect(fails).not.toContain("tech.https.no_redirect");
    expect(a.scores.technical.score).toBeGreaterThanOrEqual(90);
    expect(a.scores.content.score).toBeGreaterThanOrEqual(85);
    expect(a.scores.overall).toBeGreaterThanOrEqual(85);
    expect(a.findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")).toHaveLength(0);
  });
  it("leaves search/local unmeasured rather than faking them", () => {
    expect(a.scores.search.score).toBeNull();
    expect(a.scores.local.score).toBeNull();
    expect(a.scores.search.reason).toMatch(/Phase 2/);
  });
});

describe("technically broken site", () => {
  let a: Awaited<ReturnType<typeof audit>>;
  beforeAll(async () => {
    a = await audit("https://broken.test");
  });
  it("detects the technical problems with evidence", () => {
    const fails = failed(a.runs);
    for (const id of ["tech.sitemap.missing", "tech.index.noindex_important", "tech.index.canonical_mismatch", "tech.status.4xx", "tech.status.5xx", "tech.redirect.chain", "tech.mobile.viewport_missing", "tech.html.lang_missing", "tech.https.mixed_content", "tech.https.no_redirect", "tech.host.www_inconsistent", "tech.schema.invalid_json", "tech.security.hsts_missing", "tech.url.hygiene", "tech.robots.blocks_important"]) {
      expect(fails, id).toContain(id);
    }
    const chain = byId(a.runs, "tech.redirect.chain");
    expect(chain.outcome.affected[0]).toMatchObject({ url: "https://broken.test/chain-start", detected: "2 hops" });
    expect((chain.outcome.affected[0].evidence as { chain: string[] }).chain).toHaveLength(3);
    const noindex = byId(a.runs, "tech.index.noindex_important");
    expect(noindex.outcome.affected.map((x) => x.url)).toEqual(["https://broken.test/services"]);
    expect(noindex.severity).toBe("CRITICAL");
    const s5 = byId(a.runs, "tech.status.5xx");
    expect(s5.outcome.affected[0].detected).toBe("HTTP 500");
  });
  it("detects content problems: duplicate titles, missing meta, multiple/missing h1, missing alt, oversized image", () => {
    const fails = failed(a.runs);
    for (const id of ["content.title.duplicate", "content.meta.missing", "content.h1.multiple", "content.images.missing_alt", "content.images.oversized", "content.conversion.no_tel_link", "content.conversion.no_primary_cta", "content.conversion.no_form"]) expect(fails, id).toContain(id);
    expect(byId(a.runs, "content.images.oversized").outcome.affected[0].detected).toMatch(/2441 KB/);
  });
  it("groups checks into client-facing findings with developer details", () => {
    const g = findingByKey(a.findings, "https_security")!;
    expect(g).toBeDefined();
    expect(g.checkIds).toEqual(expect.arrayContaining(["tech.https.no_redirect", "tech.https.mixed_content", "tech.host.www_inconsistent"]));
    expect(g.developerDetails.length).toBeGreaterThanOrEqual(3);
    expect(g.developerDetails.find((d) => d.checkId === "tech.https.mixed_content")?.urls[0].url).toBe("https://broken.test/");
    expect(g.whyItMatters).toMatch(/customers/); // plumbing vocabulary, not "patients"
    expect(g.recommendedFix.split("\n").length).toBeGreaterThan(2);
    const idx = findingByKey(a.findings, "indexability")!;
    expect(idx.severity).toBe("CRITICAL");
    expect(idx.affectedUrls).toContain("https://broken.test/services");
  });
  it("rolls several homepage problems into a page-level finding", () => {
    const page = findingByKey(a.findings, "page:/");
    expect(page).toBeDefined();
    expect(page!.title).toMatch(/Homepage optimization is incomplete/);
    expect(page!.checkIds.length).toBeGreaterThanOrEqual(3);
    expect(page!.affectedUrls).toEqual(["https://broken.test/"]);
  });
  it("scores low with a traceable breakdown", () => {
    expect(a.scores.technical.score).toBeLessThan(40);
    const total = a.scores.technical.penalties.reduce((s, p) => s + p.penalty, 0);
    expect(a.scores.technical.score).toBe(Math.max(0, Math.round(100 - total)));
    expect(a.scores.technical.penalties[0].penalty).toBeGreaterThanOrEqual(a.scores.technical.penalties[1].penalty); // sorted
    expect(a.scores.technical.penalties.find((p) => p.checkId === "tech.mobile.viewport_missing")).toMatchObject({ weight: 30, pageShare: 1, penalty: 30 });
  });
  it("orders findings by severity first, then by priority score within a severity", () => {
    const first = a.findings[0];
    expect(["CRITICAL", "HIGH"]).toContain(first.severity);
    const rank = (s: string) => SEVERITY_ORDER.indexOf(s as never);
    for (let i = 1; i < a.findings.length; i++) {
      const prev = a.findings[i - 1];
      const cur = a.findings[i];
      expect(rank(prev.severity)).toBeLessThanOrEqual(rank(cur.severity));
      if (prev.severity === cur.severity) expect(prev.priorityScore).toBeGreaterThanOrEqual(cur.priorityScore);
    }
  });
});

describe("thin-content site", () => {
  it("flags thin pages, missing meta, missing h1 and grades content as at risk", async () => {
    const a = await audit("https://thin.test");
    const fails = failed(a.runs);
    expect(fails).toContain("content.thin_page");
    expect(fails).toContain("content.meta.missing");
    expect(fails).toContain("content.h1.missing");
    expect(fails).toContain("tech.sitemap.missing");
    const thin = byId(a.runs, "content.thin_page");
    expect(thin.outcome.affected.map((x) => x.url).sort()).toEqual(["https://thin.test/", "https://thin.test/pricing", "https://thin.test/services"]); // contact is a utility page
    expect(thin.severity).toBe("HIGH"); // escalated: ≥50% of pages
    expect(a.scores.content.score).toBeLessThan(55);
    expect(findingByKey(a.findings, "thin_duplicate_content")!.severity).toBe("HIGH");
  });
});

describe("duplicate-content site", () => {
  it("detects identical city pages and duplicate titles/descriptions, and stale sitemap urls", async () => {
    const a = await audit("https://dup.test", { category: "Roofing Company" });
    const dup = byId(a.runs, "content.duplicate_body");
    expect(dup.outcome.status).toBe("FAIL");
    expect(dup.outcome.affected.map((x) => x.url).sort()).toEqual(["https://dup.test/brampton", "https://dup.test/mississauga", "https://dup.test/toronto"]);
    expect(byId(a.runs, "content.title.duplicate").outcome.affected.length).toBe(4);
    expect(byId(a.runs, "content.meta.duplicate").outcome.affected.length).toBe(4);
    expect(byId(a.runs, "tech.sitemap.stale_urls").outcome.affected[0]).toMatchObject({ url: "https://dup.test/gone", detected: "HTTP 410" });
    expect(byId(a.runs, "content.keyword.title_no_location").outcome.status).toBe("FAIL");
    expect(findingByKey(a.findings, "thin_duplicate_content")!.whyItMatters).toMatch(/customer/);
  });
});

describe("malformed site", () => {
  it("still produces findings and never throws", async () => {
    const a = await audit("https://malformed.test");
    const fails = failed(a.runs);
    expect(fails).toContain("tech.schema.invalid_json");
    expect(fails).toContain("tech.html.basics");
    expect(fails).toContain("tech.mobile.viewport_missing");
    expect(fails).toContain("content.headings.skipped_levels");
    expect(fails).toContain("tech.sitemap.invalid");
    expect(a.runs.filter((r) => r.outcome.reason?.startsWith("check error"))).toHaveLength(0);
    expect(a.scores.overall).not.toBeNull();
  });
});

describe("rate limiting", () => {
  it("treats 429 as inconclusive, backs off, and does not report throttled pages as broken", async () => {
    const site = {
      ...ALL_SITES,
      "https://healthy.test/services": { status: 429, headers: { "content-type": "text/html", "retry-after": "5" }, body: "slow down" },
      "https://healthy.test/about": { status: 429, headers: { "content-type": "text/html" }, body: "slow down" },
    };
    const { fetchImpl } = makeFetch(site);
    const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://healthy.test", { budget: { concurrency: 2, politenessDelayMs: 1 } });
    expect(crawl.stats.rateLimited).toBe(2);
    expect(crawl.pages.find((p) => p.url === "https://healthy.test/services")?.fetchError).toMatch(/rate limited/);
    const ctx = buildCheckContext(crawl, { name: "Test Co", city: "Toronto", industry: industryFromCategory("Plumbing Company") }, "healthy.test");
    const runs = runChecks(ctx);
    expect(byId(runs, "tech.status.4xx").outcome.status).toBe("PASS");
    expect(byId(runs, "tech.sitemap.stale_urls").outcome.status).toBe("PASS");
    expect(byId(runs, "tech.crawl.rate_limited").outcome.status).toBe("INFO");
    expect(byId(runs, "content.trust.no_about_page").outcome.status).toBe("PASS"); // linked + throttled ≠ missing
  });
});

describe("industry vocabulary", () => {
  it("uses patients/practice for a dental business", async () => {
    const a = await audit("https://thin.test", { category: "Dental Clinic" });
    const f = findingByKey(a.findings, "thin_duplicate_content")!;
    expect(f.whyItMatters).toMatch(/patient/);
    expect(f.whyItMatters).not.toMatch(/customer/);
  });
});

describe("validation-round fixes", () => {
  it("judges www consistency against the host the seed lands on, not the typed host", async () => {
    // Typed www., site canonical is non-www and www redirects to it → not inconsistent.
    const site = { ...ALL_SITES, "https://www.healthy.test/": { status: 301, headers: { location: "https://healthy.test/" } } };
    const { fetchImpl } = makeFetch(site);
    const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://www.healthy.test", { budget: { concurrency: 2, politenessDelayMs: 1 } });
    expect(crawl.canonicalHost).toBe("healthy.test");
    const ctx = buildCheckContext(crawl, { name: "x", city: "Toronto", industry: industryFromCategory("Plumbing Company") }, "www.healthy.test");
    expect(byId(runChecks(ctx), "tech.host.www_inconsistent").outcome.status).toBe("PASS");
  });

  it("does not escalate site-wide MEDIUM checks to HIGH just because pageShare is 1", async () => {
    const a = await audit("https://thin.test");
    const nap = byId(a.runs, "content.trust.no_nap_on_home");
    expect(nap.outcome.status).toBe("FAIL");
    expect(nap.severity).toBe("MEDIUM");
  });

  it("treats bot protection as 'not measurable': no failing checks, null scores, one INFO", async () => {
    const site = { "https://blocked.test/": { status: 403, headers: { "content-type": "text/html", "x-datadome": "protected" }, body: "<html><body>captcha</body></html>" }, "https://blocked.test/robots.txt": { headers: { "content-type": "text/plain" }, body: "User-agent: *\nAllow: /\n" } };
    const { fetchImpl } = makeFetch(site);
    const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://blocked.test", { budget: { politenessDelayMs: 1 } });
    expect(crawl.blocked?.vendor).toBe("datadome");
    const ctx = buildCheckContext(crawl, { name: "x", industry: industryFromCategory("Software Company") }, "blocked.test");
    const runs = runChecks(ctx);
    expect(runs.filter((r) => r.outcome.status === "FAIL")).toHaveLength(0);
    expect(byId(runs, "tech.reach.blocked").outcome.status).toBe("INFO");
    const scores = computeScores(runs, { localRelevant: false, searchMeasured: false });
    expect(scores.overall).toBeNull();
    expect(scores.technical.score).toBeNull();
  });

  it("records a homepage timeout as inconclusive rather than a critical outage or a pile of content failures", async () => {
    const site = { "https://slow.test/": { hang: true }, "https://slow.test/robots.txt": { status: 404, headers: { "content-type": "text/plain" }, body: "" } };
    const { fetchImpl } = makeFetch(site);
    const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://slow.test", { budget: { fetchTimeoutMs: 100, politenessDelayMs: 1 } });
    const ctx = buildCheckContext(crawl, { name: "x", city: "Toronto", industry: industryFromCategory("Plumbing Company") }, "slow.test");
    const runs = runChecks(ctx);
    expect(byId(runs, "tech.reach.unreachable").outcome.status).toBe("INFO");
    expect(byId(runs, "tech.status.5xx").outcome.status).toBe("PASS");
    expect(byId(runs, "content.trust.no_contact_page").outcome.status).toBe("SKIPPED");
    // robots.txt and sitemap answered 404 in this fixture → genuinely missing; everything page-based is skipped
    expect(runs.filter((r) => r.outcome.status === "FAIL").map((r) => r.def.id)).toEqual(["tech.robots.missing", "tech.sitemap.missing"]);
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false, measurable: ctx.htmlPages.length > 0 });
    expect(scores.overall).toBeNull();
    expect(scores.technical.reason).toMatch(/not measured/);
  });

  it("flags soft 404s and keeps per-page roll-ups capped", async () => {
    const site: Record<string, { status?: number; headers?: Record<string, string>; body?: string }> = {
      "https://flat.test/robots.txt": { status: 404, headers: { "content-type": "text/plain" }, body: "" },
      "https://flat.test/sitemap.xml": { status: 404, headers: { "content-type": "text/plain" }, body: "" },
      "https://flat.test/": { headers: { "content-type": "text/html" }, body: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Flat</title></head><body><main>${Array.from({ length: 12 }, (_, i) => `<a href="/p${i}">p${i}</a>`).join("")}<p>${"word ".repeat(400)}</p></main></body></html>` },
      "https://flat.test/missing": { headers: { "content-type": "text/html" }, body: `<html><head><title>404 Page Not Found</title></head><body><h1>Page not found</h1><p>Sorry.</p></body></html>` },
    };
    for (let i = 0; i < 12; i++) site[`https://flat.test/p${i}`] = { headers: { "content-type": "text/html" }, body: `<html><head><title>P${i}</title></head><body><p>${"tiny ".repeat(20)}</p><a href="/">home</a><a href="/missing">x</a></body></html>` };
    const { fetchImpl } = makeFetch(site);
    const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://flat.test", { budget: { concurrency: 2, politenessDelayMs: 1 } });
    const ctx = buildCheckContext(crawl, { name: "x", industry: industryFromCategory("Retail Store") }, "flat.test");
    const runs = runChecks(ctx);
    const findings = buildFindings(runs, ctx);
    expect(byId(runs, "tech.status.soft_404").outcome.affected.map((a) => a.url)).toEqual(["https://flat.test/missing"]);
    expect(findings.filter((f) => f.findingKey.startsWith("page:")).length).toBeLessThanOrEqual(5);
  });
});
