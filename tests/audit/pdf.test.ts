import { describe, it, expect } from "vitest";
import { PDFDocument, PDFDict, PDFName, PDFString } from "pdf-lib";
import { renderTechnicalPdf } from "@/lib/audit/pdf/technicalPdf";
import { renderCustomerPdf } from "@/lib/audit/pdf/customerPdf";
import { pdfSafe } from "@/lib/audit/pdf/layout";
import { downloadFileName, customerPdfIsCurrent, pdfFileName, resolvePdfPath } from "@/lib/audit/pdf/generate";
import { buildOpportunityScenario } from "@/lib/audit/opportunity/scenario";
import { normalizePsiResponse } from "@/lib/audit/providers/pagespeed";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { buildCheckContext, runChecks } from "@/lib/audit/checks";
import { buildFindings } from "@/lib/audit/findings/groups";
import { computeScores } from "@/lib/audit/scoring";
import { bucketFor } from "@/lib/audit/priority";
import { industryFromCategory } from "@/lib/industry";
import { makeFetch, testResolver, ALL_SITES } from "../fixtures/sites";
import { psiResponse, POOR_MOBILE_LH13 } from "../fixtures/pagespeed";
import LH13_ALL from "../fixtures/psi-lighthouse13-all-categories.json";
import type { V2ReportPayload } from "@/lib/audit/report";

/** A complete v2 payload from offline fixtures: crawl → checks → findings → scores, plus PageSpeed rows. */
async function buildPayload(opts: { withPerformance: boolean; withCategories?: boolean }): Promise<V2ReportPayload> {
  const { fetchImpl } = makeFetch(ALL_SITES);
  const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://thin.test", { budget: { concurrency: 2, politenessDelayMs: 1 } });
  const ctx = buildCheckContext(crawl, { name: "Thin Dental", city: "Toronto", industry: industryFromCategory("Dental Clinic") }, "thin.test");
  const home = ctx.homepage?.url ?? "https://thin.test/";
  const perfRows: V2ReportPayload["performance"] = [];
  if (opts.withPerformance) {
    const mobile = normalizePsiResponse(home, "mobile", psiResponse(home, POOR_MOBILE_LH13), 1);
    const desktop = normalizePsiResponse(home, "desktop", opts.withCategories === false ? psiResponse(home, { score: 0.9, field: null }) : LH13_ALL, 1);
    ctx.performance = [mobile, desktop];
    for (const r of [mobile, desktop]) perfRows.push({ url: r.url, strategy: r.strategy, pageType: "home", selectionReason: "homepage", status: r.status, error: r.error ?? null, field: r.field, lab: r.lab, lcpElement: r.lcpElement, diagnostics: r.diagnostics, categories: opts.withCategories === false ? null : r.categories, agentic: opts.withCategories === false ? null : r.agentic, lighthouseVersion: r.lighthouseVersion, analysisUtc: "2026-09-16T11:39:45.595Z" });
  }
  const runs = runChecks(ctx, opts.withPerformance ? ["TECHNICAL", "CONTENT", "PERFORMANCE"] : ["TECHNICAL", "CONTENT"]);
  const findings = buildFindings(runs, ctx);
  const scores = computeScores(runs, { localRelevant: true, searchMeasured: false });
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, OPPORTUNITY: 0 } as Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OPPORTUNITY", number>;
  for (const f of findings) counts[f.severity]++;
  return {
    engine: "CRAWL_V2",
    status: "COMPLETED",
    progress: { engine: "CRAWL_V2", stage: "done", stages: [{ key: "performance", label: "Testing site performance", status: opts.withPerformance ? "done" : "skipped", detail: opts.withPerformance ? "2/2 PageSpeed runs" : "disabled" }], pagesDiscovered: crawl.stats.pagesDiscovered, pagesCrawled: crawl.stats.pagesCrawled, findingsSoFar: findings.length, previewReady: true, scoresLocked: true, updatedAt: new Date().toISOString() },
    scoresLocked: true,
    scores: { overall: scores.overall, technical: scores.technical.score, content: scores.content.score, performance: scores.performance.score, search: null, local: null, grades: { overall: "needs_work", technical: "good", content: "at_risk", performance: "at_risk", search: "not_measured", local: "not_measured" }, breakdown: null },
    severityCounts: counts,
    crawlStats: crawl.stats,
    findings: findings.map((f, i) => ({ id: `f${i}`, findingKey: f.findingKey, checkIds: f.checkIds, pillar: f.pillar as V2ReportPayload["findings"][number]["pillar"], section: f.section, severity: f.severity, title: f.title, affectedUrls: f.affectedUrls, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, expectedValue: f.expectedValue, whyItMatters: f.whyItMatters, recommendedFix: f.recommendedFix, developerDetails: f.developerDetails, evidence: f.evidence, impact: f.impact, effort: f.effort, confidence: f.confidence, priorityScore: f.priorityScore, owner: f.owner, bucket: bucketFor(f), evidenceKind: f.evidenceKind, source: f.source, device: f.device, metric: f.metric })),
    performance: perfRows,
    ai: [],
    pages: crawl.pages.map((p) => ({ url: p.url, statusCode: p.statusCode, title: p.facts?.title ?? null, indexable: p.indexable, wordCount: p.facts?.wordCount ?? null, depth: p.depth, fetchMs: p.fetchMs })),
    checks: runs.map((r) => ({ checkId: r.def.id, pillar: r.def.pillar, status: r.outcome.status, severity: r.severity, affectedPageCount: r.affectedPageCount, pageShare: r.pageShare, weight: r.def.weight, penalty: 0, reason: r.outcome.reason ?? null })),
    competitors: null,
    localComparison: { state: "none" },
    opportunity: buildOpportunityScenario({}, { upliftPoints: 2, illustrativeAllowed: true }),
  };
}

/** Every /URI action in the document's link annotations. */
async function linkUris(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const out: string[] = [];
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookup(i, PDFDict);
      const action = a.lookup(PDFName.of("A"), PDFDict);
      const uri = action?.lookup(PDFName.of("URI"));
      if (uri instanceof PDFString) out.push(uri.decodeText());
    }
  }
  return out;
}

const input = (payload: V2ReportPayload) => ({ business: { name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto", industryLabel: "Practice", customersWord: "patients" }, completedAt: new Date("2026-09-16T12:00:00Z"), headline: { line1: "Here's Exactly", line2: "What To Fix First." }, summary: "We crawled 3 pages and ran 88 checks.", reportUrl: "https://smileaimarketing.com/audit/tok", consultationUrl: "https://smileaimarketing.com/book-consultation?publicToken=tok", technicalReportRequestUrl: "https://smileaimarketing.com/book-consultation?publicToken=tok&request=technical-report", payload });
const render = (payload: V2ReportPayload) => renderTechnicalPdf(input(payload));

describe("v2 report PDF", () => {
  it("renders a valid multi-page PDF carrying every section, every finding and the hidden details", async () => {
    const payload = await buildPayload({ withPerformance: true });
    expect(payload.findings.length).toBeGreaterThan(3);
    const out = await render(payload);
    expect(String.fromCharCode(...out.bytes.slice(0, 5))).toBe("%PDF-");
    expect(out.pageCount).toBeGreaterThanOrEqual(3);
    const t = out.transcript;
    // sections
    for (const h of ["Findings by area", "Google website checks", "Action plan", `Detailed findings (${payload.findings.length})`]) expect(t).toContain(h);
    // overview
    expect(t).toContain("Here's Exactly What To Fix First.");
    expect(t).toContain(`Overall SEO health: ${payload.scores!.overall}/100`);
    expect(t).toContain("Not a Google score");
    // five Google checks for the desktop run (real LH13 fixture) with page/device/date context
    expect(t).toContain("Homepage · Desktop · tested September 16, 2026 · Lighthouse 13.4.1");
    expect(t).toContain("Performance: 86/100 (Needs work)");
    expect(t).toContain("Accessibility: 98/100 (Good)");
    expect(t).toContain("Best Practices: 100/100 (Good)");
    expect(t).toContain("Google SEO: 92/100 (Good)");
    expect(t).toContain("Agentic Browsing: 2 of 2 checks passed");
    expect(t).toContain("not our SEO audit");
    expect(t).toContain("llms.txt follows recommendations — Not applicable");
    expect(t).toContain("Links are not crawlable"); // the failing Google SEO audit is listed
    // mobile run (synthetic LH13 fixture): categories absent → honest
    expect(t).toContain("Homepage · Mobile · tested September 16, 2026");
    expect(t).toMatch(/Accessibility: not collected/);
    expect(t).toContain("Lab measurements only");
    // every finding title, every check id and every developer note is printed
    for (const f of payload.findings) {
      expect(t).toContain(f.title);
      for (const d of (f.developerDetails as Array<{ checkId: string; developerFix: string | null }>) ?? []) {
        expect(t).toContain(d.checkId);
        if (d.developerFix) expect(t).toContain(pdfSafe(d.developerFix.split("\n")[0]));
      }
    }
    // pillar explanation of our score vs Google's
    expect(t).toContain("Why our Performance pillar");
    // no unsupported outcome claims (the technical report carries no financial section at all)
    expect(t.toLowerCase()).not.toMatch(/costing you|lost patients|more patients/);
  });

  it("renders the honest unavailable state when PageSpeed did not run, and never invents Google scores", async () => {
    const payload = await buildPayload({ withPerformance: false });
    const out = await render(payload);
    const t = out.transcript;
    expect(t).toContain("Google's checks were not run for this audit (disabled)");
    expect(t).not.toMatch(/Accessibility: \d+\/100/);
    expect(t).not.toMatch(/Agentic Browsing: \d+ of/);
    expect(t).toContain("Performance: Not measured");
    expect(out.pageCount).toBeGreaterThanOrEqual(2);
  });

  it("older audits (performance only) show the four other checks as not collected", async () => {
    const payload = await buildPayload({ withPerformance: true, withCategories: false });
    const t = (await render(payload)).transcript;
    expect(t).toMatch(/Performance: 90\/100/);
    expect(t).toMatch(/Best Practices: not collected/);
    expect(t).toMatch(/Agentic Browsing: not collected/);
    expect(t).toContain("Not collected for this audit");
  });

  it("makes text safe for the built-in fonts", () => {
    expect(pdfSafe("LCP ≤ 2.5 s → good ✓ ★ — “quoted” … é")).toBe("LCP <= 2.5 s -> good OK * — “quoted” … é");
    expect(pdfSafe("emoji 🎉 gone")).toBe("emoji  gone");
  });

  it("builds safe, distinct download names, detects stale cached PDFs, and never resolves paths outside the report directories", () => {
    expect(downloadFileName("Gélinas Dental Studio & Co.", new Date("2026-09-16T12:00:00Z"))).toBe("gelinas-dental-studio-co-seo-audit-2026-09-16.pdf");
    expect(downloadFileName("Gélinas Dental Studio & Co.", new Date("2026-09-16T12:00:00Z"), "technical")).toBe("gelinas-dental-studio-co-seo-audit-technical-report-2026-09-16.pdf");
    expect(downloadFileName("!!!", new Date("2026-09-16T12:00:00Z"))).toBe("website-seo-audit-2026-09-16.pdf");
    expect(pdfFileName("tok", "customer")).not.toBe(pdfFileName("tok", "technical"));
    const base = { publicToken: "tok", pdfStatus: "READY", pdfUrl: `private:${pdfFileName("tok", "customer")}`, pdfGeneratedAt: new Date("2026-09-16T13:00:00Z"), completedAt: new Date("2026-09-16T12:00:00Z") };
    expect(customerPdfIsCurrent(base)).toBe(true);
    expect(customerPdfIsCurrent({ ...base, pdfUrl: "/reports/audit-tok.pdf" })).toBe(false); // legacy public file → regenerate privately
    expect(customerPdfIsCurrent({ ...base, pdfUrl: "/reports/audit-tok-v2r1.pdf" })).toBe(false); // previous layout
    expect(customerPdfIsCurrent({ ...base, pdfUrl: "private:audit-tok-customer-cust-r6.pdf" })).toBe(false); // layout before the editorial rebuild → regenerate
    expect(pdfFileName("tok", "customer")).toContain("cust-r7");
    // A competitor measured after the PDF was rendered belongs in the next download.
    expect(customerPdfIsCurrent({ ...base, competitorGaps: [{ measuredAt: new Date(base.pdfGeneratedAt.getTime() - 1000) }] })).toBe(true);
    expect(customerPdfIsCurrent({ ...base, competitorGaps: [{ measuredAt: new Date(base.pdfGeneratedAt.getTime() + 1000) }] })).toBe(false);
    // While the comparison stage is queued/running the file omits it and is provisional → re-render on download;
    // once the stage reports back after the render, the file is stale; a stage that never reports back stops
    // forcing re-renders after the pending timeout.
    const now = new Date("2026-09-16T13:05:00Z");
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "queued", at: "2026-09-16T12:59:00Z" } } }, now)).toBe(false);
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "running", at: "2026-09-16T12:59:00Z" } } }, now)).toBe(false);
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "done", at: "2026-09-16T13:01:00Z" } } }, now)).toBe(false);
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "done", at: "2026-09-16T12:59:00Z" } } }, now)).toBe(true);
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "skipped", at: "2026-09-16T12:59:00Z" } } }, now)).toBe(true);
    expect(customerPdfIsCurrent({ ...base, summaryJson: { localComparison: { status: "running", at: "2026-09-16T12:30:00Z" } } }, now)).toBe(true); // timed out → no longer provisional
    expect(customerPdfIsCurrent({ ...base, summaryJson: { garbage: true } }, now)).toBe(true);
    expect(customerPdfIsCurrent({ ...base, pdfGeneratedAt: new Date("2026-09-16T11:00:00Z") })).toBe(false); // older than the run
    expect(customerPdfIsCurrent({ ...base, pdfStatus: "FAILED" })).toBe(false);
    expect(resolvePdfPath("private:audit-tok-customer-cust-r1.pdf")).toMatch(/\/storage\/reports\/audit-tok-customer-cust-r1\.pdf$/);
    expect(resolvePdfPath("/reports/audit-tok.pdf")).toMatch(/\/public\/reports\/audit-tok\.pdf$/);
    expect(resolvePdfPath("private:../../.env")).toBeNull();
    expect(resolvePdfPath("/reports/../.env.pdf")).toBeNull();
  });
});

describe("customer PDF — business briefing", () => {
  it("renders the editorial layout — cover, one page per problem, closing contact — and keeps technical clutter out", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const out = await renderCustomerPdf(input(payload));
    const t = out.transcript;
    expect(out.pageCount).toBeGreaterThanOrEqual(4);
    expect(out.pageCount).toBeLessThanOrEqual(9);

    // Cover: kicker, headline, the numbers, what's inside, the extra-findings tally
    expect(t).toContain("Exclusive briefing — For Thin Dental Studio — Toronto");
    expect(t).toMatch(/\d+ Verified Problems\. Your Site Scores \d+\/100\./);
    expect(t).toContain("Here's What To Fix First.");
    expect(t).toContain("By the numbers");
    expect(t).toContain("Inside this report");
    expect(t).toMatch(/Also found: \d+ further findings/);

    // A story per problem: kicker, editorial headline, measured chip, both columns, the strip
    for (const p of payload.findings.slice(0, 3)) expect(t).toContain(p.title);
    expect(t).toContain("Story 01");
    expect(t).toContain("What's happening");
    expect(t).toContain("How to fix it");
    expect(t).toContain("What you'll get");

    // Closing: the three actions and a phone number and email, not a form
    expect(t).toContain("Start Here. We'll Do The Rest With You.");
    expect(t).toContain("+1 437-971-4014 -> tel:+14379714014");
    expect(t).toContain("hello@smileaimarketing.com -> mailto:hello@smileaimarketing.com");
    expect(t).toContain("Or book a 15-minute website review online -> https://smileaimarketing.com/book-consultation?publicToken=tok");
    expect(t).toContain("Request your full technical report -> https://smileaimarketing.com/book-consultation?publicToken=tok&request=technical-report");

    // One deterministic money scenario, labelled; no per-issue losses
    expect(t).toContain("What Could This Be Worth?");
    expect(t).toMatch(/Illustrative example/i);
    expect(t).toMatch(/No separate loss is added up per issue/);
    expect(t).not.toMatch(/\$0\b/);

    // no technical clutter, no dev URLs, no outcome claims
    expect(t).not.toMatch(/\b(perf|content|tech)\.[a-z_]+\.[a-z_]+/);
    expect(t).not.toMatch(/<[a-z]+[ >]|Cache-Control|fetchpriority/i);
    expect(t).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(t.toLowerCase()).not.toMatch(/is costing you|lost patients|more patients|you are losing/);
    expect(t).not.toMatch(/variant=technical|technical-pdf|\/pdf\?/);
    expect(t).not.toMatch(/All \d+ findings/);

    // order: cover → stories → worth → next moves
    const idx = (x: string) => t.indexOf(x);
    expect(idx("Exclusive briefing — For Thin Dental Studio — Toronto")).toBeLessThan(idx("Story 01"));
    expect(idx("Story 01")).toBeLessThan(idx("What Could This Be Worth?"));
    expect(idx("What Could This Be Worth?")).toBeLessThan(idx("Start Here. We'll Do The Rest With You."));

    const uris = await linkUris(out.bytes);
    expect(uris).toContain("tel:+14379714014");
    expect(uris).toContain("mailto:hello@smileaimarketing.com");
    expect(uris).toContain("https://smileaimarketing.com/book-consultation?publicToken=tok");
    expect(uris.some((u) => /variant=technical|technical-pdf/.test(u))).toBe(false);

    // nothing about competitors without verified competitor data
    expect(t).not.toMatch(/nearby practices?/i);
  });

  it("web report and PDF are built from one briefing: identical headline, summary, problems, counts and actions", async () => {
    const { buildBriefing } = await import("@/lib/audit/view/briefing");
    const payload = await buildPayload({ withPerformance: true });
    const args = {
      business: { name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto" },
      scores: { overall: payload.scores!.overall, performance: payload.scores!.performance },
      severityCounts: payload.severityCounts,
      findings: payload.findings.map((f) => ({ ...f, developerDetails: f.developerDetails as never })),
      pagesCrawled: (payload.crawlStats as { pagesCrawled: number }).pagesCrawled,
      checksRun: payload.checks.filter((c) => c.status === "PASS" || c.status === "FAIL").length,
    };
    const b = buildBriefing(args);
    expect(buildBriefing(args)).toEqual(b); // deterministic
    expect(b.summary.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(60);
    expect(b.problems.length).toBe(3);
    expect(b.actions.length).toBe(3);
    // every problem line traces to the finding it came from
    for (const p of b.problems) expect(payload.findings.some((f) => f.title.startsWith(p.headline))).toBe(true);
    // no outcome language anywhere in the briefing text
    const all = [b.headline, b.summary, ...b.problems.flatMap((p) => [p.headline, p.evidence, p.implication, p.action]), ...b.actions.flatMap((a) => [a.title, a.detail])].join(" ").toLowerCase();
    expect(all).not.toMatch(/guarantee|rank higher|revenue|lost patients|costing you/);
    // the PDF prints exactly those strings
    const t = (await renderCustomerPdf(input(payload))).transcript;
    expect(t).toContain(b.headline);
    expect(t).toContain(b.summary);
    for (const p of b.problems) expect(t).toContain(p.headline);
    for (const a of b.actions) expect(t).toContain(a.title);
  });

  it("local competitors: verified names, URLs and comparable measurements; pending and failed are different states", async () => {
    const { buildLocalComparison } = await import("@/lib/audit/competitors/view");
    const { fromPerfResult } = await import("@/lib/audit/competitors/measure");
    const payload = await buildPayload({ withPerformance: true });
    const good = fromPerfResult(normalizePsiResponse("https://lakesidedental.ca/", "mobile", LH13_ALL as unknown, 1));
    const failed = fromPerfResult(normalizePsiResponse("https://yongedental.ca/", "mobile", { error: { message: "quota" } }, 1));
    const row = (name: string, rank: number, m: unknown, measuredAt: Date | null = new Date("2026-09-17T09:05:00Z")) => ({ id: name, auditId: "a", name, website: `https://${name.toLowerCase().replace(/\s+/g, "")}.ca/`, rank, mapScore: null, createdAt: new Date("2026-09-17T09:00:00Z"), source: "GOOGLE_PLACES", placeId: "p", address: "Toronto, ON", relevance: "dental practice · about 2 km from you", discoveredAt: new Date("2026-09-17T09:00:00Z"), measuredAt, measurementJson: m as never });
    const practice = { name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto" };

    // Competitors ahead → the advantage headline is allowed
    const ahead = buildLocalComparison(practice, [row("Lakeside Dental", 1, good), row("Harbour Dental", 2, good)] as never, payload.performance as never)!;
    expect(ahead.gaps.some((g) => g.direction === "competitor_better")).toBe(true);
    const t = (await renderCustomerPdf(input({ ...payload, competitors: ahead }))).transcript;
    expect(t).toContain("Nearby Practices Are Beating Your Page");
    expect(t).toContain("Thin Dental Studio (you) (https://thin.test): Performance");
    expect(t).toMatch(/Lakeside Dental \(https:\/\/lakesidedental\.ca\/\): Performance \d+\/100/);
    expect(t).toContain("Where they beat you");
    expect(t).toContain("How this comparison was made");
    expect(t).toContain("Nearby practices located with Google Maps");
    for (const g of ahead.gaps.filter((x) => x.direction === "competitor_better")) expect(t).toContain(g.sentence);
    // no ranking or business-outcome claims anywhere in the competitor section itself
    const section = t.slice(t.indexOf("Nearby Practices Are Beating Your Page"));
    expect(section).not.toMatch(/\brank(s|ing|ed)?\b/i);
    expect(section.toLowerCase()).not.toMatch(/more patients|market share|better overall|more revenue/);

    // Practice ahead everywhere → no advantage headline, comparison still shown
    const weak = { ...good, performanceScore: 1, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 30000 };
    const behind = buildLocalComparison(practice, [row("Lakeside Dental", 1, weak), row("Harbour Dental", 2, weak)] as never, payload.performance as never)!;
    const t2 = (await renderCustomerPdf(input({ ...payload, competitors: behind }))).transcript;
    expect(t2).not.toContain("Nearby Practices Are Beating Your Page");
    expect(t2).toContain("How Your Page Measures Up Nearby");
    expect(t2).toContain("Lakeside Dental (https://lakesidedental.ca/): Performance 1/100");
    expect(t2).toContain("Harbour Dental (https://harbourdental.ca/): Performance 1/100"); // nobody ahead → everyone listed

    // Google's own rings for the audited homepage are printed in the briefing — only for the
    // categories Google actually returned (this fixture's mobile run has no category scores).
    expect(t).toMatch(/Performance: \d+\/100 \(Google, mobile\)/);
    expect(t).not.toMatch(/Accessibility: \d+\/100 \(Google, mobile\)/);

    // Selection: practices ahead on at least one measure are shown, a competitor still being
    // analysed is shown as pending, and one that simply could not be measured is left out.
    const mixed = buildLocalComparison(practice, [row("Lakeside Dental", 1, good), row("Yonge Dental", 2, failed), row("Bay Dental", 3, null, null)] as never, payload.performance as never)!;
    const t3 = (await renderCustomerPdf(input({ ...payload, competitors: mixed }))).transcript;
    expect(t3).toMatch(/Lakeside Dental \(https:\/\/lakesidedental\.ca\/\): Performance \d+\/100/);
    expect(t3).toContain("Bay Dental (https://baydental.ca/): Analysis in progress");
    expect(t3).not.toContain("Yonge Dental");
    expect(t3).toContain("1 of the 1 nearby practice we measured scored ahead of your homepage");
    // a competitor's cells are filled in only where they lead; the dash is explained under the table
    expect(t3).toMatch(/Lakeside Dental \(https:\/\/lakesidedental\.ca\/\): Performance \d+\/100.*(Accessibility -|Best practices -|Google SEO -)/);
    expect(t3).toContain("A dash means that practice did not measure ahead of your homepage on that measure");
    expect(t3).toContain("1 more is still being analysed");

    // Every practice that measured ahead is listed; none is dropped.
    const aheadNames = new Set(ahead.gaps.filter((g) => g.direction === "competitor_better").map((g) => g.competitor));
    for (const n of aheadNames) expect(t).toContain(n);
  });

  it("without PageSpeed: no rings are drawn and no Google result is invented", async () => {
    const payload = await buildPayload({ withPerformance: false });
    const t = (await renderCustomerPdf(input(payload))).transcript;
    expect(t).not.toMatch(/GOOGLE PAGESPEED INSIGHTS/);
    expect(t).not.toMatch(/Accessibility: \d+\/100|Agentic Browsing: \d+ of/);
    expect(t).toMatch(/Verified Problems/);
  });
});

describe("financial opportunity in the customer PDF", () => {
  const sv = (value: number, source: "ga4" | "crm" | "finance", period: string | null, label: string) => ({ value, source, label, period });

  it("prints the verified scenario with the same figures the web report receives, plus sources, period and assumptions", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const scenario = buildOpportunityScenario(
      { monthlyVisitors: sv(1000, "ga4", "Aug 2026", "GA4 sessions"), currentRate: sv(0.02, "ga4", "Aug 2026", "GA4 enquiry conversions"), patientRate: sv(0.5, "crm", "Aug 2026", "booking export"), contribution: sv(400, "finance", "FY2025", "practice financials") },
      { upliftPoints: 2, illustrativeAllowed: true }
    );
    const out = await renderCustomerPdf(input({ ...payload, opportunity: scenario }));
    const t = out.transcript;
    expect(t).toMatch(/Practice-specific scenario/i);
    // figures come from the shared scenario object — web and PDF cannot diverge
    expect(t).toContain(`$${Math.round(scenario.figures.monthlyContribution!).toLocaleString("en-CA")} — Potential additional contribution a month under this scenario`);
    expect(t).toContain(`About $${Math.round(scenario.figures.dailyContribution!).toLocaleString("en-CA")} a day over 30 days, from 20 additional enquiries a month and 10 additional patients.`);
    expect(t).toContain("Measurement period: Aug 2026; FY2025.");
    expect(t).toMatch(/Improvement assumption: enquiry rate rises from 2% to 4%/);
    expect(t).toMatch(/Google Analytics, Aug 2026/);
    expect(t).not.toMatch(/losing \$|is costing you/);
  });

  it("prints a partial scenario without a dollar amount and names what is missing", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const scenario = buildOpportunityScenario({ monthlyVisitors: sv(2000, "ga4", "Aug 2026", "GA4 sessions"), currentRate: sv(0.01, "ga4", "Aug 2026", "GA4 enquiries") }, { upliftPoints: 2, illustrativeAllowed: true });
    const t = (await renderCustomerPdf(input({ ...payload, opportunity: scenario }))).transcript;
    expect(t).toMatch(/Partial scenario/i);
    expect(t).toContain("Additional enquiries a month under this scenario");
    expect(t).toMatch(/A dollar figure needs enquiries that become patients and contribution per new patient/);
    expect(t).not.toMatch(/\$0\b/);
  });

  it("prints the formula only (no amount) when illustrations are disabled and no data is authorised", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const scenario = buildOpportunityScenario({}, { upliftPoints: 2, illustrativeAllowed: false });
    const t = (await renderCustomerPdf(input({ ...payload, opportunity: scenario }))).transcript;
    expect(t).toMatch(/No dollar figure/i);
    expect(t).not.toMatch(/\$\d/);
    expect(t).toContain("No dollar figure is shown for this practice");
  });
});
