import { describe, it, expect } from "vitest";
import { runPageSpeed, normalizePsiResponse, rate, THRESHOLDS } from "@/lib/audit/providers/pagespeed";
import { psiResponse, makePsiFetch, POOR_MOBILE, NO_CRUX, POOR_MOBILE_LH13 } from "../fixtures/pagespeed";
import LH13_REAL from "../fixtures/psi-lighthouse13-mobile.json";
import LH13_ALL from "../fixtures/psi-lighthouse13-all-categories.json";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { buildCheckContext, runChecks } from "@/lib/audit/checks";
import { buildFindings } from "@/lib/audit/findings/groups";
import { computeScores } from "@/lib/audit/scoring";
import { runPerformanceStage } from "@/lib/audit/stages/performance";
import { priorityScore } from "@/lib/audit/priority";
import { industryFromCategory } from "@/lib/industry";
import { makeFetch, testResolver, ALL_SITES } from "../fixtures/sites";

const U = "https://healthy.test/";

describe("PageSpeed normalization", () => {
  it("normalizes a healthy response: field and lab kept apart, CLS ÷100, diagnostics capped", () => {
    const r = normalizePsiResponse(U, "mobile", psiResponse(U, { field: { lcp: [1900, "FAST"], inp: [120, "FAST"], cls: [4, "FAST"], overall: "FAST" } }), 1200);
    expect(r.status).toBe("ok");
    expect(r.field.available).toBe(true);
    expect(r.field.source).toBe("url");
    expect(r.field.cls?.percentile).toBeCloseTo(0.04);
    expect(r.field.lcp).toEqual({ percentile: 1900, category: "FAST" });
    expect(r.lab?.performanceScore).toBe(92);
    expect(r.lab?.lcpMs).toBe(1800);
    expect(r.lab?.ttiMs).toBe(2600);
    expect(r.lcpElement?.snippet).toContain("hero.jpg");
    expect(r.diagnostics.find((d) => d.id === "render-blocking-resources")?.savingsMs).toBe(0);
    expect(r.lighthouseVersion).toBe("12.0.0");
  });

  it("uses origin-level CrUX when the URL has none, and marks it", () => {
    const r = normalizePsiResponse(U, "mobile", psiResponse(U, { field: { lcp: [2900, "AVERAGE"], source: "origin" } }), 1);
    expect(r.field.available).toBe(true);
    expect(r.field.source).toBe("origin");
    expect(r.field.inp).toBeNull();
  });

  it("labels PSI's origin_fallback copy of the origin data as origin-level, never as the page's own", () => {
    // Live PSI shape for a sub-page without its own CrUX data: loadingExperience carries the
    // origin's metrics with id = origin and origin_fallback = true.
    const body = psiResponse("https://example.test/blog", { field: { lcp: [2680, "AVERAGE"] } });
    const le = (body as { loadingExperience: Record<string, unknown> }).loadingExperience;
    le.id = "https://example.test";
    le.origin_fallback = true;
    (body as Record<string, unknown>).originLoadingExperience = { ...le };
    const r = normalizePsiResponse("https://example.test/blog", "mobile", body, 1);
    expect(r.field.available).toBe(true);
    expect(r.field.source).toBe("origin");
    expect(r.field.lcp?.percentile).toBe(2680);
    // A genuine URL-level record (id = the page, no fallback flag) stays url-level.
    const own = normalizePsiResponse("https://example.test/blog", "mobile", psiResponse("https://example.test/blog", { field: { lcp: [2100, "FAST"] } }), 1);
    expect(own.field.source).toBe("url");
  });

  it("marks CrUX unavailable without inventing anything", () => {
    const r = normalizePsiResponse(U, "mobile", psiResponse(U, NO_CRUX), 1);
    expect(r.status).toBe("ok");
    expect(r.field).toMatchObject({ available: false, source: null, lcp: null, inp: null, cls: null });
    expect(r.lab?.performanceScore).toBe(71);
  });

  it("treats missing diagnostics / partial audits as absent, not as failures", () => {
    const r = normalizePsiResponse(U, "mobile", psiResponse(U, { omitAudits: ["render-blocking-resources", "third-party-summary", "largest-contentful-paint-element", "interactive"] }), 1);
    expect(r.status).toBe("ok");
    expect(r.diagnostics.some((d) => d.id === "render-blocking-resources")).toBe(false);
    expect(r.lcpElement).toBeNull();
    expect(r.lab?.ttiMs).toBeNull();
  });

  it("rejects malformed bodies and Lighthouse runtime errors as unavailable", () => {
    expect(normalizePsiResponse(U, "mobile", { foo: 1 }, 1)).toMatchObject({ status: "unavailable", errorCode: "malformed" });
    expect(normalizePsiResponse(U, "mobile", { lighthouseResult: { audits: {} } }, 1)).toMatchObject({ status: "unavailable", errorCode: "malformed" });
    expect(normalizePsiResponse(U, "mobile", psiResponse(U, { runtimeError: { code: "FAILED_DOCUMENT_REQUEST", message: "blocked" } }), 1)).toMatchObject({ status: "unavailable", errorCode: "rejected" });
  });

  it("rates against Google thresholds", () => {
    expect(rate(2400, THRESHOLDS.lcpMs)).toBe("good");
    expect(rate(3000, THRESHOLDS.lcpMs)).toBe("needs_improvement");
    expect(rate(4100, THRESHOLDS.lcpMs)).toBe("poor");
    expect(rate(95, THRESHOLDS.labScore, true)).toBe("good");
    expect(rate(null, THRESHOLDS.lcpMs)).toBeNull();
  });
});

describe("Lighthouse 13 (insight audits) normalization", () => {
  const TP = "https://www.torontoplumber.com/";

  it("normalizes a real LH 13.4.1 response: lab metrics, no CrUX, insight savings and the LCP node", () => {
    const r = normalizePsiResponse(TP, "mobile", LH13_REAL, 9000);
    expect(r.status).toBe("ok");
    expect(r.lighthouseVersion).toBe("13.4.1");
    expect(r.lab?.performanceScore).toBe(56);
    expect(r.lab?.lcpMs).toBeGreaterThan(0);
    expect(r.lab?.tbtMs).toBeGreaterThan(0);
    // loadingExperience is present but has no metrics → field unavailable, nothing invented
    expect(r.field).toMatchObject({ available: false, source: null, lcp: null });
    const ids = r.diagnostics.map((d) => d.id);
    for (const id of ["render-blocking-insight", "cache-insight", "document-latency-insight", "third-parties-insight", "dom-size-insight", "font-display-insight", "image-delivery-insight", "lcp-breakdown-insight", "unused-javascript", "redirects", "total-byte-weight"]) expect(ids, id).toContain(id);
    expect(ids).not.toContain("render-blocking-resources");
    // savingsMs from metricSavings (no overallSavingsMs on insights)
    const rb = r.diagnostics.find((d) => d.id === "render-blocking-insight")!;
    expect(rb.savingsMs).toBe(2600);
    expect(rb.metricSavings).toEqual({ LCP: 2600, FCP: 2600 });
    expect(rb.totals.count).toBeGreaterThan(0);
    // savingsBytes from debugData.wastedBytes
    expect(r.diagnostics.find((d) => d.id === "cache-insight")!.savingsBytes).toBeCloseTo(40799.4, 0);
    expect(r.diagnostics.find((d) => d.id === "image-delivery-insight")!.savingsBytes).toBe(144556);
    // checklist insight
    const dl = r.diagnostics.find((d) => d.id === "document-latency-insight")!;
    expect(dl.checklist).toEqual({ serverResponseIsFast: true, noRedirects: false, usesCompression: true });
    expect(dl.items).toEqual([]);
    // third parties: entity is a plain string, mainThreadTime → ms
    const tp = r.diagnostics.find((d) => d.id === "third-parties-insight")!;
    expect(tp.items[0].url).toBe("Google Tag Manager");
    expect(tp.items[0].ms).toBeCloseTo(199.57, 1);
    expect(tp.totals.ms).toBeGreaterThan(200);
    // dom size keeps numericValue
    expect(r.diagnostics.find((d) => d.id === "dom-size-insight")!.numericValue).toBe(804);
    // LCP element from lcp-breakdown-insight (the legacy audit no longer exists)
    expect(r.lcpElement?.snippet).toContain("elementor-heading-title");
    // legacy redirects audit still carries overallSavingsMs
    expect(r.diagnostics.find((d) => d.id === "redirects")!.savingsMs).toBe(780);
  });

  it("redacts credential-looking query params in third-party resource URLs (the audited site's own keys)", () => {
    const body = psiResponse(U, { audits: { "third-parties-insight": { title: "3rd parties", score: 1, details: { type: "table", items: [{ entity: "Google Maps", transferSize: 1000, mainThreadTime: 5, subItems: { type: "subitems", items: [] } }] } }, "render-blocking-insight": { title: "Render blocking", score: 0, metricSavings: { LCP: 400 }, details: { type: "table", items: [{ url: "https://maps.googleapis.com/maps/api/js?v=3&key=AIzaSyFAKE0000000000000000000000000000&callback=init", wastedMs: 400 }, { url: "https://cdn.test/a.js?v=3", wastedMs: 10 }] } } } });
    const r = normalizePsiResponse(U, "mobile", body, 1);
    const rb = r.diagnostics.find((d) => d.id === "render-blocking-insight")!;
    expect(rb.items[0].url).toBe("https://maps.googleapis.com/maps/api/js?v=3&key=%5Bredacted%5D&callback=init");
    expect(rb.items[1].url).toBe("https://cdn.test/a.js?v=3");
    expect(JSON.stringify(r)).not.toContain("AIzaSyFAKE");
  });

  it("not-applicable insights (LCP is not an image) normalize to empty, not to failures", () => {
    const r = normalizePsiResponse(TP, "mobile", LH13_REAL, 1);
    const lcp = r.diagnostics.find((d) => d.id === "lcp-discovery-insight")!;
    expect(lcp.score).toBeNull();
    expect(lcp.checklist).toBeNull();
    expect(lcp.items).toEqual([]);
  });

  it("real LH13 response: diagnostic checks fire from insight audits (render-blocking, fonts, redirects) and stay quiet where the site is fine", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": { body: LH13_REAL } });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } })).results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const status = (id: string) => runs.find((r) => r.def.id === id)!.outcome.status;
    const detected = (id: string) => runs.find((r) => r.def.id === id)!.outcome.affected[0]?.detected;
    expect(status("perf.diag.render_blocking")).toBe("FAIL");
    expect(detected("perf.diag.render_blocking")).toMatch(/2600 ms/);
    expect(status("perf.diag.fonts")).toBe("FAIL"); // score 0, 170 ms
    expect(status("perf.diag.redirects")).toBe("FAIL");
    expect(status("perf.diag.images")).toBe("FAIL"); // 141 KB
    expect(status("perf.diag.compression")).toBe("PASS"); // usesCompression: true
    expect(status("perf.diag.caching")).toBe("PASS"); // 40 KB < 100 KB
    expect(status("perf.diag.dom_size")).toBe("PASS"); // 804 elements
    expect(status("perf.diag.third_party")).toBe("PASS"); // ~216 ms main-thread
    expect(status("perf.diag.lcp_resource")).toBe("PASS"); // not applicable
    // nothing is reported as "Lighthouse did not report …" for audits LH13 renamed
    const notReported = runs.filter((r) => r.outcome.status === "SKIPPED" && /did not report/.test(r.outcome.reason ?? "")).map((r) => r.def.id);
    expect(notReported).toEqual([]);
    // no CrUX → field checks skipped, lab LCP used
    expect(status("perf.mobile.field.lcp_poor")).toBe("SKIPPED");
    expect(status("perf.mobile.lab.lcp_poor")).toMatch(/FAIL|PASS/);
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).not.toBeNull();
    expect(scores.performance.score!).toBeLessThan(100);
  });

  it("poor site on LH13: every diagnostic check fires from the insight audits with evidence", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": (strategy) => ({ body: psiResponse(U, strategy === "mobile" ? POOR_MOBILE_LH13 : { score: 0.95 }) }) });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } })).results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const failed = runs.filter((r) => r.outcome.status === "FAIL").map((r) => r.def.id);
    for (const id of ["perf.diag.render_blocking", "perf.diag.unused_js", "perf.diag.images", "perf.diag.lcp_resource", "perf.diag.caching", "perf.diag.compression", "perf.diag.third_party", "perf.diag.main_thread", "perf.diag.dom_size", "perf.diag.fonts", "perf.diag.payload", "perf.mobile.lab.score_poor"]) expect(failed, id).toContain(id);
    const by = (id: string) => runs.find((r) => r.def.id === id)!.outcome.affected[0];
    expect(by("perf.diag.caching").detected).toMatch(/1464 KB/); // debugData total, not the 5 capped items
    expect(by("perf.diag.compression").detected).toMatch(/uncompressed/);
    expect(by("perf.diag.third_party").detected).toMatch(/1300 ms main-thread time from 2 third parties/);
    expect(by("perf.diag.lcp_resource").detected).toMatch(/lazy-loaded/);
    expect(by("perf.diag.lcp_resource").detected).toMatch(/fetchpriority/);
    expect((by("perf.diag.lcp_resource").evidence as { checklist: Record<string, boolean> }).checklist.requestDiscoverable).toBe(true);
    expect(by("perf.diag.images").detected).toMatch(/141 KB/);
    expect(by("perf.diag.dom_size").detected).toMatch(/3400 elements/);
    expect(ctx.performance[0].lcpElement?.snippet).toContain("hero.jpg");
    // grouped findings carry the insight ids in developer details
    const findings = buildFindings(runs, ctx);
    const lcp = findings.find((f) => f.findingKey === "perf_lcp")!;
    const ev = lcp.developerDetails.find((d) => d.checkId === "perf.diag.lcp_resource")!.urls[0].evidence as { lighthouseAudits: Array<{ id: string }> };
    expect(ev.lighthouseAudits.map((a) => a.id)).toContain("lcp-discovery-insight");
  });
});

describe("Google website checks (Lighthouse categories + Agentic Browsing)", () => {
  const TP = "https://www.torontoplumber.com/";

  it("extracts Accessibility / Best Practices / SEO scores with passed/applicable counts and the failing audits", () => {
    const r = normalizePsiResponse(TP, "desktop", LH13_ALL, 1);
    expect(r.status).toBe("ok");
    expect(r.lab?.performanceScore).toBe(86);
    expect(r.categories.accessibility).toMatchObject({ score: 98, applicable: 26, passed: 25 });
    expect(r.categories.accessibility!.failed.map((a) => a.id)).toEqual(["heading-order"]);
    expect(r.categories.accessibility!.failed[0].title).toMatch(/heading/i);
    expect(r.categories.bestPractices).toMatchObject({ score: 100, applicable: 12, passed: 12, failed: [] });
    expect(r.categories.seo).toMatchObject({ score: 92, applicable: 10, passed: 9 });
    expect(r.categories.seo!.failed.map((a) => a.id)).toEqual(["crawlable-anchors"]);
  });

  it("presents Agentic Browsing as passed/applicable checks (binary + not-applicable audits), never a percentage", () => {
    const r = normalizePsiResponse(TP, "desktop", LH13_ALL, 1);
    expect(r.agentic).not.toBeNull();
    expect(r.agentic).toMatchObject({ score: 1, passed: 2, applicable: 2 });
    expect(r.agentic!.checks).toHaveLength(6);
    const byId = Object.fromEntries(r.agentic!.checks.map((c) => [c.id, c]));
    expect(byId["agent-accessibility-tree"]).toMatchObject({ score: 1, mode: "binary", group: "agent-accessibility" });
    expect(byId["webmcp-form-coverage"]).toMatchObject({ score: null, mode: "notApplicable" });
    expect(byId["llms-txt"]).toMatchObject({ score: null, mode: "notApplicable" });
  });

  it("older / performance-only responses leave the other categories null rather than inventing them", () => {
    const r = normalizePsiResponse(TP, "mobile", LH13_REAL, 1); // performance-only fixture
    expect(r.categories).toEqual({ accessibility: null, bestPractices: null, seo: null });
    expect(r.agentic).toBeNull();
    const u = normalizePsiResponse(TP, "mobile", { foo: 1 }, 1);
    expect(u.categories).toEqual({ accessibility: null, bestPractices: null, seo: null });
    expect(u.agentic).toBeNull();
  });

  it("requests all five categories, and retries without a category the API rejects", async () => {
    const seen: string[][] = [];
    const { fetchImpl: ok } = makePsiFetch({ "*": { body: psiResponse(U) } });
    const spy = async (endpoint: string, init: Parameters<typeof ok>[1]) => {
      const cats = new URL(endpoint).searchParams.getAll("category");
      seen.push(cats);
      if (cats.includes("agentic-browsing")) return new Response(JSON.stringify({ error: { code: 400, message: "Invalid value at 'category' (type.googleapis.com/...Category), \"agentic-browsing\"", status: "INVALID_ARGUMENT" } }), { status: 400, headers: { "content-type": "application/json" } });
      return ok(endpoint, init);
    };
    const r = await runPageSpeed(U, "mobile", { fetchImpl: spy });
    expect(seen[0]).toEqual(["performance", "accessibility", "best-practices", "seo", "agentic-browsing"]);
    expect(seen[1]).toEqual(["performance", "accessibility", "best-practices", "seo"]);
    expect(r.status).toBe("ok");
    expect(r.agentic).toBeNull();
    // a 400 that is not about categories is still a rejection, not a retry loop
    const { fetchImpl: bad } = makePsiFetch({ "*": { status: 400, body: { error: { message: "Lighthouse returned error: NO_FCP" } } } });
    expect(await runPageSpeed(U, "mobile", { fetchImpl: bad })).toMatchObject({ status: "unavailable", errorCode: "rejected" });
  });
});

describe("runPageSpeed transport", () => {
  it("times out", async () => {
    const { fetchImpl } = makePsiFetch({ "*": { hang: true } });
    const r = await runPageSpeed(U, "mobile", { fetchImpl, timeoutMs: 50 });
    expect(r).toMatchObject({ status: "unavailable", errorCode: "timeout" });
  });
  it("reports rate limiting", async () => {
    const { fetchImpl } = makePsiFetch({ "*": { status: 429, body: { error: { message: "Quota exceeded" } } } });
    expect(await runPageSpeed(U, "mobile", { fetchImpl })).toMatchObject({ status: "unavailable", errorCode: "rate_limited" });
  });
  it("reports a rejected URL (400) with Google's message", async () => {
    const { fetchImpl } = makePsiFetch({ "*": { status: 400, body: { error: { message: "Lighthouse returned error: FAILED_DOCUMENT_REQUEST" } } } });
    const r = await runPageSpeed(U, "mobile", { fetchImpl });
    expect(r.errorCode).toBe("rejected");
    expect(r.error).toContain("FAILED_DOCUMENT_REQUEST");
  });
  it("handles non-JSON bodies", async () => {
    const { fetchImpl } = makePsiFetch({ "*": { text: "<html>oops</html>" } });
    expect(await runPageSpeed(U, "mobile", { fetchImpl })).toMatchObject({ status: "unavailable", errorCode: "malformed" });
  });
  it("passes strategy and optional key", async () => {
    const { fetchImpl, log } = makePsiFetch({ "*": { body: psiResponse(U) } });
    await runPageSpeed(U, "desktop", { fetchImpl, apiKey: "k" });
    expect(log).toEqual(["desktop https://healthy.test/"]);
  });
  it("sends the key only as a query parameter and never lets it into a result", async () => {
    const KEY = "AIzaSy-test-secret-key-0000";
    const seen: string[] = [];
    // A fetch that fails quoting the full endpoint (the worst case for a leak).
    const fetchImpl = async (endpoint: string) => {
      seen.push(endpoint);
      throw new Error(`request to ${endpoint} failed`);
    };
    const r = await runPageSpeed(U, "mobile", { fetchImpl, apiKey: KEY });
    expect(new URL(seen[0]).searchParams.get("key")).toBe(KEY);
    expect(r.status).toBe("unavailable");
    expect(JSON.stringify(r)).not.toContain(KEY);
    expect(r.error).toContain("[redacted]");
    // Google's own error text is redacted too.
    const { fetchImpl: f2 } = makePsiFetch({ "*": { status: 400, body: { error: { message: `bad key ${KEY}` } } } });
    const r2 = await runPageSpeed(U, "mobile", { fetchImpl: f2, apiKey: KEY });
    expect(JSON.stringify(r2)).not.toContain(KEY);
    // Without a key nothing is added to the query.
    const { fetchImpl: f3, log } = makePsiFetch({ "*": { body: psiResponse(U) } });
    const spy = async (endpoint: string, init: Parameters<typeof f3>[1]) => {
      expect(new URL(endpoint).searchParams.has("key")).toBe(false);
      return f3(endpoint, init);
    };
    await runPageSpeed(U, "mobile", { fetchImpl: spy });
    expect(log).toHaveLength(1);
  });
  it("classifies a non-JSON 429 and a 403 RESOURCE_EXHAUSTED as rate limiting, a plain 403 as an HTTP error", async () => {
    const { fetchImpl: html429 } = makePsiFetch({ "*": { status: 429, text: "<html>Too Many Requests</html>" } });
    expect(await runPageSpeed(U, "mobile", { fetchImpl: html429 })).toMatchObject({ status: "unavailable", errorCode: "rate_limited" });
    const { fetchImpl: quota403 } = makePsiFetch({ "*": { status: 403, body: { error: { code: 403, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'", errors: [{ reason: "rateLimitExceeded" }] } } } });
    expect(await runPageSpeed(U, "mobile", { fetchImpl: quota403 })).toMatchObject({ status: "unavailable", errorCode: "rate_limited" });
    const { fetchImpl: disabled403 } = makePsiFetch({ "*": { status: 403, body: { error: { code: 403, status: "PERMISSION_DENIED", message: "PageSpeed Insights API has not been used in project 123 before or it is disabled.", errors: [{ reason: "accessNotConfigured" }] } } } });
    const r = await runPageSpeed(U, "mobile", { fetchImpl: disabled403 });
    expect(r).toMatchObject({ status: "unavailable", errorCode: "http_error" });
    expect(r.error).toContain("has not been used in project");
  });
});

async function ctxFor(url = "https://healthy.test") {
  const { fetchImpl } = makeFetch(ALL_SITES);
  const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), url, { budget: { concurrency: 2, politenessDelayMs: 1 } });
  return buildCheckContext(crawl, { name: "Test Co", city: "Toronto", industry: industryFromCategory("Plumbing Company") }, new URL(crawl.seedUrl).hostname);
}

describe("performance stage + checks + scoring", () => {
  it("selects representative pages, runs mobile then desktop, and scores a healthy site high", async () => {
    const ctx = await ctxFor();
    const { fetchImpl, log } = makePsiFetch({ "*": { body: psiResponse(U, { field: { lcp: [1900, "FAST"], inp: [100, "FAST"], cls: [3, "FAST"] } }) } });
    const stage = await runPerformanceStage(ctx, { maxPages: 4, psi: { fetchImpl } });
    expect(stage.selected.map((s) => s.pageType)).toEqual(["home", "service", "conversion", "content"]);
    expect(stage.selected[1].url).toBe("https://healthy.test/services");
    expect(stage.results).toHaveLength(8);
    expect(log.slice(0, 4).every((l) => l.startsWith("mobile"))).toBe(true);
    ctx.performance = stage.results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    expect(runs.filter((r) => r.outcome.status === "FAIL")).toHaveLength(0);
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).toBe(100);
  });

  it("poor mobile: field data drives CWV checks, lab equivalents are skipped, diagnostics fire with evidence, ledger explains the score", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": (strategy) => ({ body: psiResponse(U, strategy === "mobile" ? POOR_MOBILE : { score: 0.95 }) }) });
    const stage = await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } });
    ctx.performance = stage.results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const failed = runs.filter((r) => r.outcome.status === "FAIL").map((r) => r.def.id);
    for (const id of ["perf.mobile.field.lcp_poor", "perf.mobile.field.inp_poor", "perf.mobile.field.cls_poor", "perf.mobile.lab.score_poor", "perf.mobile.lab.tbt_high", "perf.diag.render_blocking", "perf.diag.unused_js", "perf.diag.images", "perf.diag.lcp_resource", "perf.diag.caching", "perf.diag.compression", "perf.diag.third_party", "perf.diag.main_thread", "perf.diag.dom_size", "perf.diag.fonts", "perf.diag.payload"]) expect(failed, id).toContain(id);
    // lab LCP/CLS skipped because field data exists
    expect(runs.find((r) => r.def.id === "perf.mobile.lab.lcp_poor")!.outcome).toMatchObject({ status: "SKIPPED" });
    expect(runs.find((r) => r.def.id === "perf.mobile.lab.lcp_poor")!.outcome.reason).toMatch(/field/);
    // desktop was fine
    expect(failed).not.toContain("perf.desktop.lab.score_poor");
    const lcp = runs.find((r) => r.def.id === "perf.mobile.field.lcp_poor")!;
    expect(lcp.outcome.affected[0].detected).toMatch(/4800 ms at the 75th percentile/);
    const third = runs.find((r) => r.def.id === "perf.diag.third_party")!;
    expect(third.outcome.affected[0].detected).toMatch(/830 ms/);
    expect((third.outcome.affected[0].evidence as { lighthouseAudits: Array<{ id: string }> }).lighthouseAudits[0].id).toBe("third-party-summary");
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).toBe(0);
    const total = scores.performance.penalties.reduce((s, p) => s + p.penalty, 0);
    expect(total).toBeGreaterThan(100);
    expect(scores.performance.penalties[0].checkId).toBe("perf.mobile.lab.score_poor");
    // grouped findings carry device + source + Lighthouse audit ids
    const findings = buildFindings(runs, ctx);
    const lcpGroup = findings.find((f) => f.findingKey === "perf_lcp")!;
    expect(lcpGroup.source).toBe("pagespeed");
    expect(lcpGroup.evidenceKind).toBe("MEASURED");
    expect(lcpGroup.device).toBe("mobile");
    expect(lcpGroup.checkIds).toEqual(expect.arrayContaining(["perf.mobile.field.lcp_poor", "perf.diag.lcp_resource"]));
    expect(findings.find((f) => f.findingKey === "perf.diag.images")).toBeDefined(); // image savings stand alone — not evidence that the hero delays LCP
    expect(lcpGroup.developerDetails.find((d) => d.checkId === "perf.mobile.field.lcp_poor")?.dataSource).toBe("field");
    expect(findings.find((f) => f.findingKey === "perf_third_party")?.owner).toBe("owner");
  });

  it("good desktop / poor mobile: mobile deductions dominate, desktop adds none", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": (strategy) => ({ body: psiResponse(U, strategy === "mobile" ? { score: 0.42, lcpMs: 4500, field: null } : { score: 0.96 }) }) });
    const stage = await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } });
    ctx.performance = stage.results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const failed = runs.filter((r) => r.outcome.status === "FAIL").map((r) => r.def.id);
    expect(failed).toContain("perf.mobile.lab.score_poor");
    expect(failed).toContain("perf.mobile.lab.lcp_poor"); // no field → lab counts
    expect(failed.some((id) => id.startsWith("perf.desktop"))).toBe(false);
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).toBe(100 - 15 - 8);
  });

  it("CrUX unavailable: field checks are skipped with a reason and cost nothing", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": { body: psiResponse(U, NO_CRUX) } });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } })).results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const field = runs.find((r) => r.def.id === "perf.mobile.field.lcp_poor")!;
    expect(field.outcome.status).toBe("SKIPPED");
    expect(field.outcome.reason).toMatch(/no Chrome UX/);
    expect(runs.find((r) => r.def.id === "perf.field.unavailable")!.outcome.status).toBe("INFO");
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    // same fixture served for desktop → desktop "needs improvement" too (3 pts vs 7 for mobile: mobile weighs more)
    expect(scores.performance.penalties.map((p) => p.checkId)).toEqual(["perf.mobile.lab.score_needs_improvement", "perf.mobile.lab.lcp_needs_improvement", "perf.mobile.lab.tbt_moderate", "perf.desktop.lab.score_needs_improvement"]);
    expect(scores.performance.score).toBe(100 - 7 - 4 - 3 - 3);
  });

  it("UNKNOWN behaviour: API timeout / rate limit / malformed → performance is null and overall is unaffected", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "https://healthy.test/": { status: 429, body: {} }, "https://healthy.test/services": { hang: true }, "*": { text: "nope" } });
    const stage = await runPerformanceStage(ctx, { maxPages: 3, psi: { fetchImpl, timeoutMs: 50 } });
    expect(stage.results.every((r) => r.status === "unavailable")).toBe(true);
    ctx.performance = stage.results;
    const runs = runChecks(ctx, ["TECHNICAL", "CONTENT", "PERFORMANCE"]);
    expect(runs.filter((r) => r.def.pillar === "PERFORMANCE" && r.outcome.status === "FAIL")).toHaveLength(0);
    expect(runs.find((r) => r.def.id === "perf.psi.unavailable")!.outcome.status).toBe("INFO");
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).toBeNull();
    expect(scores.performance.reason).toMatch(/unavailable/);
    const without = computeScores(runs.filter((r) => r.def.pillar !== "PERFORMANCE"), { localRelevant: true, searchMeasured: false });
    expect(scores.overall).toBe(without.overall);
  });

  it("partial: one of several URLs fails → pageShare uses tested pages only", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "https://healthy.test/": { body: psiResponse(U, { score: 0.4, field: null }) }, "https://healthy.test/services": { status: 500, body: { error: { message: "boom" } } }, "*": { body: psiResponse(U, { score: 0.95, field: null }) } });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 3, psi: { fetchImpl } })).results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    const poor = runs.find((r) => r.def.id === "perf.mobile.lab.score_poor")!;
    expect(poor.affectedPageCount).toBe(1);
    expect(poor.pageShare).toBeCloseTo(1 / 2); // 2 successful mobile runs
    expect(poor.affectsHomepage).toBe(true);
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.penalties.find((p) => p.checkId === "perf.mobile.lab.score_poor")?.penalty).toBe(15); // share 0.5 → full weight
  });

  it("mobile unavailable but desktop measured: desktop checks still run, mobile checks are skipped, share uses tested pages", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": (strategy) => (strategy === "mobile" ? { status: 500, body: { error: { message: "Lighthouse returned error: NO_FCP" } } } : { body: psiResponse(U, { score: 0.4, field: null }) }) });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 2, psi: { fetchImpl } })).results;
    const runs = runChecks(ctx, ["PERFORMANCE"]);
    expect(runs.find((r) => r.def.id === "perf.mobile.lab.score_poor")!.outcome).toMatchObject({ status: "SKIPPED" });
    expect(runs.find((r) => r.def.id === "perf.mobile.lab.score_poor")!.outcome.reason).toMatch(/mobile/);
    const desktop = runs.find((r) => r.def.id === "perf.desktop.lab.score_poor")!;
    expect(desktop.outcome.status).toBe("FAIL");
    expect(desktop.affectedPageCount).toBe(2);
    expect(desktop.pageShare).toBe(1); // 2 of the 2 tested pages
    const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
    expect(scores.performance.score).toBe(100 - 6);
    expect(runs.find((r) => r.def.id === "perf.psi.unavailable")!.outcome.status).toBe("INFO");
  });

  it("finding priority: a performance finding is judged against tested pages, not the whole crawl", async () => {
    const ctx = await ctxFor();
    expect(ctx.indexablePages.length).toBeGreaterThan(1);
    const { fetchImpl } = makePsiFetch({ "*": { body: psiResponse(U, { score: 0.4, field: null, lcpMs: 1800, tbtMs: 50 }) } });
    ctx.performance = (await runPerformanceStage(ctx, { maxPages: 1, psi: { fetchImpl } })).results; // homepage only
    const runs = runChecks(ctx, ["TECHNICAL", "CONTENT", "PERFORMANCE"]);
    const findings = buildFindings(runs, ctx);
    const f = findings.find((x) => x.findingKey === "perf_mobile_load")!;
    expect(f.affectedPageCount).toBe(1);
    // 1 of 1 tested pages → full reach (a crawl-wide denominator would give 1/6 and halve the priority).
    expect(f.priorityScore).toBe(priorityScore({ severity: f.severity, impact: f.impact, effort: f.effort, confidence: f.confidence, pageShare: 1, affectsHomepage: true }));
    expect(f.priorityScore).toBeGreaterThan(priorityScore({ severity: f.severity, impact: f.impact, effort: f.effort, confidence: f.confidence, pageShare: 1 / ctx.indexablePages.length, affectsHomepage: true }));
  });

  it("stage time budget: runs that cannot start are marked unavailable, not scored", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": { hang: true } });
    const stage = await runPerformanceStage(ctx, { maxPages: 4, concurrency: 1, maxDurationMs: 30, psi: { fetchImpl, timeoutMs: 40 } });
    expect(stage.results.length).toBe(8);
    expect(stage.results.filter((r) => r.errorCode === "timeout").length).toBe(8);
  });
});
