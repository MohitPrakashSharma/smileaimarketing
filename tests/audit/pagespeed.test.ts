import { describe, it, expect } from "vitest";
import { runPageSpeed, normalizePsiResponse, rate, THRESHOLDS } from "@/lib/audit/providers/pagespeed";
import { psiResponse, makePsiFetch, POOR_MOBILE, NO_CRUX } from "../fixtures/pagespeed";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { buildCheckContext, runChecks } from "@/lib/audit/checks";
import { buildFindings } from "@/lib/audit/findings/groups";
import { computeScores } from "@/lib/audit/scoring";
import { runPerformanceStage } from "@/lib/audit/stages/performance";
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
    expect(lcpGroup.checkIds).toEqual(expect.arrayContaining(["perf.mobile.field.lcp_poor", "perf.diag.lcp_resource", "perf.diag.images"]));
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

  it("stage time budget: runs that cannot start are marked unavailable, not scored", async () => {
    const ctx = await ctxFor();
    const { fetchImpl } = makePsiFetch({ "*": { hang: true } });
    const stage = await runPerformanceStage(ctx, { maxPages: 4, concurrency: 1, maxDurationMs: 30, psi: { fetchImpl, timeoutMs: 40 } });
    expect(stage.results.length).toBe(8);
    expect(stage.results.filter((r) => r.errorCode === "timeout").length).toBe(8);
  });
});
