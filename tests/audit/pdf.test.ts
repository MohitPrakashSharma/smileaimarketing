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
    expect(customerPdfIsCurrent({ ...base, pdfUrl: "private:audit-tok-customer-cust-r4.pdf" })).toBe(false); // layout before the competitor call-out → regenerate
    expect(pdfFileName("tok", "customer")).toContain("cust-r5");
    // A competitor measured after the PDF was rendered belongs in the next download.
    expect(customerPdfIsCurrent({ ...base, competitorGaps: [{ measuredAt: new Date(base.pdfGeneratedAt.getTime() - 1000) }] })).toBe(true);
    expect(customerPdfIsCurrent({ ...base, competitorGaps: [{ measuredAt: new Date(base.pdfGeneratedAt.getTime() + 1000) }] })).toBe(false);
    expect(customerPdfIsCurrent({ ...base, pdfGeneratedAt: new Date("2026-09-16T11:00:00Z") })).toBe(false); // older than the run
    expect(customerPdfIsCurrent({ ...base, pdfStatus: "FAILED" })).toBe(false);
    expect(resolvePdfPath("private:audit-tok-customer-cust-r1.pdf")).toMatch(/\/storage\/reports\/audit-tok-customer-cust-r1\.pdf$/);
    expect(resolvePdfPath("/reports/audit-tok.pdf")).toMatch(/\/public\/reports\/audit-tok\.pdf$/);
    expect(resolvePdfPath("private:../../.env")).toBeNull();
    expect(resolvePdfPath("/reports/../.env.pdf")).toBeNull();
  });
});

describe("customer PDF + personalised message", () => {
  it("customer PDF: concise, every finding accounted for, all five Google checks, no technical clutter or dev URLs", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const out = await renderCustomerPdf(input(payload));
    const t = out.transcript;
    expect(out.pageCount).toBeGreaterThanOrEqual(3);
    expect(out.pageCount).toBeLessThan(12);
    for (const h of ["A message for Thin Dental Studio", "Website health", "Problems and recommendations", "Action plan", `All ${payload.findings.length} findings`]) expect(t).toContain(h);
    // every stored finding is listed
    for (const f of payload.findings) expect(t).toContain(f.title);
    // Google checks, page/device/date context, agentic in passed/total form
    expect(t).toContain("Homepage · Desktop · tested September 16, 2026");
    expect(t).toContain("Accessibility: 98/100 (Good)");
    expect(t).toContain("Google SEO: 92/100 (Good)");
    expect(t).toContain("Agentic Browsing: 2 of 2 checks passed");
    expect(t).toMatch(/Accessibility: not collected/); // the mobile run has no categories
    expect(t).toContain("not the same as our SEO audit");
    // labels: ours vs Google's
    expect(t).toContain("This is not a Google score");
    // no technical clutter, no dev URLs, no outcome claims
    expect(t).not.toMatch(/\b(perf|content|tech)\.[a-z_]+\.[a-z_]+/); // check ids
    expect(t).not.toMatch(/<[a-z]+[ >]|Cache-Control|fetchpriority/i);
    expect(t).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(t.toLowerCase()).not.toMatch(/is costing you|lost patients|more patients|you are losing/);
    expect(t).toContain("https://smileaimarketing.com/audit/tok");
    // the financial section is a labelled what-if, never a stated loss, and links to the interactive calculator
    expect(t).toContain("What Could These Website Issues Be Costing Your Practice?");
    expect(t).toContain("ILLUSTRATIVE SCENARIO - NOT YOUR FIGURES");
    expect(t).toContain("Discover Your Practice's Growth Opportunities");
    expect(t).toMatch(/not benchmarks, not measurements from this audit/);
    expect(t).not.toMatch(/\$0\b/); // never CAD $0 for missing data
    // the financial section sits after the action plan and before the consultation CTA
    const plan = t.indexOf("Action plan");
    const fin = t.indexOf("What Could These Website Issues Be Costing Your Practice?");
    const cta = t.indexOf("Let's Review Your Website's Priority Fixes");
    expect(plan).toBeGreaterThan(-1);
    expect(fin).toBeGreaterThan(plan);
    expect(cta).toBeGreaterThan(fin);
    // conversion: the review CTA and the technical-report request both point at the existing consultation page
    expect(t).toContain("Let's Review Your Website's Priority Fixes");
    expect(t).toContain("Book a website review with our team to understand the findings and discuss which improvements to prioritize.");
    expect(t).toContain("Book a website review -> https://smileaimarketing.com/book-consultation?publicToken=tok");
    expect(t).toContain("Request Your Full Technical Report -> https://smileaimarketing.com/book-consultation?publicToken=tok&request=technical-report");
    expect(t).toContain("provided by our team after a website review, not sent automatically");
    // no public technical-PDF URL anywhere in the customer report
    expect(t).not.toMatch(/variant=technical|technical-pdf|\/pdf\?/);
    expect(t).not.toMatch(/available from the same page/);
    // the link annotations exist in the file itself (URI actions a PDF reader will open in the browser)
    const uris = await linkUris(out.bytes);
    expect(uris).toContain("https://smileaimarketing.com/book-consultation?publicToken=tok&request=technical-report");
    expect(uris).toContain("https://smileaimarketing.com/book-consultation?publicToken=tok");
    expect(uris.some((u) => /variant=technical|technical-pdf/.test(u))).toBe(false);
    // no local comparison section without verified competitor data
    expect(t).not.toMatch(/Compare Locally|Nearby Practices Have an Advantage/);
  });

  it("customer PDF with a verified local comparison: practice + competitors on the same test, unavailable shown as such, CTA to the consultation page", async () => {
    const { buildLocalComparison } = await import("@/lib/audit/competitors/view");
    const { fromPerfResult } = await import("@/lib/audit/competitors/measure");
    const payload = await buildPayload({ withPerformance: true });
    const good = fromPerfResult(normalizePsiResponse("https://lakesidedental.ca/", "mobile", LH13_ALL as unknown, 1));
    const failed = fromPerfResult(normalizePsiResponse("https://yongedental.ca/", "mobile", { error: { message: "quota" } }, 1));
    const row = (name: string, rank: number, m: unknown) => ({ id: name, auditId: "a", name, website: `https://${name.toLowerCase().replace(/\s+/g, "")}.ca/`, rank, mapScore: null, createdAt: new Date("2026-09-17T09:00:00Z"), source: "GOOGLE_PLACES", placeId: "p", address: "Toronto, ON", relevance: "dental practice · Toronto · 2 km away", discoveredAt: new Date("2026-09-17T09:00:00Z"), measuredAt: new Date("2026-09-17T09:05:00Z"), measurementJson: m as never });
    const comparison = buildLocalComparison({ name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto" }, [row("Lakeside Dental", 1, good), row("Yonge Dental", 2, failed)] as never, payload.performance as never);
    expect(comparison).not.toBeNull();
    const out = await renderCustomerPdf(input({ ...payload, competitors: comparison }));
    const t = out.transcript;
    expect(t).toMatch(/How Does Your Practice Compare Locally\?|Where Nearby Practices Have an Advantage/);
    // Verified name + website URL on every row of the comparison table.
    expect(t).toContain("Thin Dental Studio (you) (https://thin.test): Performance");
    expect(t).toMatch(/Lakeside Dental \(https:\/\/lakesidedental\.ca\/\): Performance \d+\/100/);
    expect(t).toContain("Yonge Dental (https://yongedental.ca/): Performance unavailable, Main content unavailable, Accessibility unavailable, Best Practices unavailable, Google SEO unavailable");
    expect(t).toContain("See How Your Practice Can Close the Gap -> https://smileaimarketing.com/book-consultation?publicToken=tok");
    expect(t).toContain("How this comparison was made");
    expect(t).toContain("Nearby practices located with Google Maps");
    // scores in the PDF are the audit's own — the comparison adds no penalty
    expect(t).toContain(`Overall SEO health: ${payload.scores!.overall}/100`);
  });

  it("customer PDF competitor call-out: mirrors the web card (largest gap per metric, only when a competitor measured better), placed before Website health", async () => {
    const { buildLocalComparison } = await import("@/lib/audit/competitors/view");
    const { fromPerfResult } = await import("@/lib/audit/competitors/measure");
    const payload = await buildPayload({ withPerformance: true });
    const row = (name: string, rank: number, m: unknown) => ({ id: name, auditId: "a", name, website: `https://${name.toLowerCase().replace(/\s+/g, "")}.ca/`, rank, mapScore: null, createdAt: new Date("2026-09-17T09:00:00Z"), source: "GOOGLE_PLACES", placeId: "p", address: null, relevance: "dental practice · about 1 km from you", discoveredAt: new Date("2026-09-17T09:00:00Z"), measuredAt: new Date("2026-09-17T09:05:00Z"), measurementJson: m as never });
    const good = fromPerfResult(normalizePsiResponse("https://lakesidedental.ca/", "mobile", LH13_ALL as unknown, 1));
    const ahead = buildLocalComparison({ name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto" }, [row("Lakeside Dental", 1, good), row("Harbour Dental", 2, good)] as never, payload.performance as never)!;
    const advantages = ahead.gaps.filter((g) => g.direction === "competitor_better");
    expect(advantages.length).toBeGreaterThan(0);
    const t = (await renderCustomerPdf(input({ ...payload, competitors: ahead }))).transcript;
    const callout = t.indexOf(advantages.length >= 2 ? "Your competitors are doing better" : "A nearby practice measured better");
    expect(callout).toBeGreaterThan(-1);
    expect(callout).toBeLessThan(t.indexOf("Website health"));
    expect(t).toContain("LOCAL COMPARISON");
    expect(t).toMatch(/scored higher than Thin Dental Studio - same Google PageSpeed test/);
    expect(t).toContain("See the full comparison online -> https://smileaimarketing.com/audit/tok#local-comparison");
    expect(t).toContain("2 of 2 nearby homepages could be measured");
    // one line per metric, the largest gap, never a ranking claim
    const metrics = [...new Set(advantages.map((g) => g.metric))];
    for (const g of advantages) {
      const largest = advantages.filter((x) => x.metric === g.metric).sort((a, b) => Math.abs(b.competitorValue - b.practiceValue) - Math.abs(a.competitorValue - a.practiceValue))[0];
      if (metrics.indexOf(g.metric) < 3) expect(t).toContain(largest.sentence);
    }
    expect(t.slice(0, t.indexOf("Website health"))).not.toMatch(/\brank(s|ing)?\b/i);

    // Practice ahead on every metric → no call-out at all (the full comparison still renders).
    const weak = { ...good, performanceScore: 1, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 30000 };
    const behind = buildLocalComparison({ name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto" }, [row("Lakeside Dental", 1, weak), row("Harbour Dental", 2, weak)] as never, payload.performance as never)!;
    expect(behind.gaps.some((g) => g.direction === "competitor_better")).toBe(false);
    const t2 = (await renderCustomerPdf(input({ ...payload, competitors: behind }))).transcript;
    expect(t2).not.toContain("Your competitors are doing better");
    expect(t2).not.toContain("A nearby practice measured better");
    expect(t2).toContain("Lakeside Dental (https://lakesidedental.ca/): Performance 1/100");

    // No comparison at all → nothing about competitors anywhere.
    const t3 = (await renderCustomerPdf(input({ ...payload, competitors: null }))).transcript;
    expect(t3).not.toContain("LOCAL COMPARISON");
    expect(t3).not.toMatch(/nearby practices? (measured|have)/i);
  });

  it("customer PDF without PageSpeed: honest, no invented Google results", async () => {
    const payload = await buildPayload({ withPerformance: false });
    const t = (await renderCustomerPdf(input(payload))).transcript;
    expect(t).toContain("Google's checks were not run for this audit");
    expect(t).not.toMatch(/Accessibility: \d+\/100|Agentic Browsing: \d+ of/);
    expect(t).toContain("Performance: Not measured");
  });

  it("personalised message: deterministic, evidence-backed, ~100–130 words, no unsupported claims", async () => {
    const { buildBusinessMessage } = await import("@/lib/audit/view/message");
    const payload = await buildPayload({ withPerformance: true });
    const mk = () => buildBusinessMessage({ businessName: "Thin Dental Studio", website: "https://thin.test", customersWord: "patients", pagesCrawled: 3, checksRun: 88, scores: payload.scores, severityCounts: payload.severityCounts, findings: payload.findings.map((f) => ({ ...f, developerDetails: f.developerDetails as never })), performance: payload.performance as never });
    const m = mk();
    expect(m.heading).toBe("A message for Thin Dental Studio");
    expect(mk().paragraphs).toEqual(m.paragraphs); // stable for the same audit
    const text = m.paragraphs.join(" ");
    expect(m.wordCount).toBeGreaterThanOrEqual(80);
    expect(m.wordCount).toBeLessThanOrEqual(140);
    expect(text).toContain("Thin Dental Studio: our audit crawled 3 pages of thin.test and ran 88 checks");
    expect(text).toContain(`${payload.findings.length} verified findings`);
    expect(text).toContain(payload.findings[0].title); // top problem named, with its measurement
    expect(text).toContain("Most consequential:");
    expect(text).toMatch(/Until these are fixed, the same obstacles meet every visitor/);
    expect(text).toContain("book a website review and our team will turn these findings into a practical improvement plan");
    expect(text).toMatch(/Also worth attention:|Most consequential:/);
    // no unsupported outcome claims, no blame for measurement gaps
    expect(text.toLowerCase()).not.toMatch(/guarantee|rank higher|revenue|costing you|lost patients|losing patients|bookings/);
    expect(text).not.toMatch(/could not test|unavailable|CrUX|API/); // a measured PageSpeed score may be quoted; a failed test never is
    // verdict follows the evidence: strong technical + weak content → "solid technical foundation"
    const shaped = buildBusinessMessage({ businessName: "Apple Tree Dental for Kids", website: "https://appletreedentalforkids.com", customersWord: "patients", pagesCrawled: 40, checksRun: 65, scores: { overall: 74, technical: 89, content: 56, performance: null, search: null, local: null }, severityCounts: { HIGH: 7, MEDIUM: 5, LOW: 4 }, findings: payload.findings.map((f) => ({ ...f, developerDetails: f.developerDetails as never })), performance: [] });
    const st = shaped.paragraphs.join(" ");
    expect(st).toContain("Apple Tree Dental for Kids: our audit crawled 40 pages");
    expect(st).toContain("Your website has issues that deserve attention now"); // 7 high-priority findings
    expect(st).toContain("7 high-priority");
    expect(st).not.toMatch(/page speed/); // performance was not measured → never named as a weakness
    expect(shaped.wordCount).toBeGreaterThanOrEqual(90);
    expect(shaped.wordCount).toBeLessThanOrEqual(135);
    // limited evidence: no findings, no performance → shorter, still honest
    const small = buildBusinessMessage({ businessName: "Tiny", website: "https://tiny.test", customersWord: "patients", pagesCrawled: 1, checksRun: 20, scores: { overall: 95, technical: 95, content: null, performance: null, search: null, local: null }, severityCounts: {}, findings: [], performance: [] });
    expect(small.paragraphs.join(" ")).toMatch(/[Nn]o issue crossed our thresholds/);
    expect(small.paragraphs.join(" ")).not.toMatch(/PageSpeed|Most consequential/);
    expect(small.wordCount).toBeLessThan(80);
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
    expect(t).toContain("PRACTICE-SPECIFIC SCENARIO - ESTIMATE");
    // figures come from the shared scenario object — web and PDF cannot diverge
    expect(t).toContain(`$${Math.round(scenario.figures.monthlyContribution!).toLocaleString("en-CA")} a month`);
    expect(t).toContain(`($${Math.round(scenario.figures.dailyContribution!).toLocaleString("en-CA")} a day)`);
    expect(t).toContain("about 20 additional enquiries a month; 10 additional patients a month");
    expect(t).toContain("Measurement period: Aug 2026; FY2025.");
    expect(t).toMatch(/Improvement assumption: enquiry rate rises from 2% to 4%/);
    expect(t).toMatch(/Google Analytics, Aug 2026/);
    expect(t).not.toMatch(/losing \$|is costing you/);
  });

  it("prints a partial scenario without a dollar amount and names what is missing", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const scenario = buildOpportunityScenario({ monthlyVisitors: sv(2000, "ga4", "Aug 2026", "GA4 sessions"), currentRate: sv(0.01, "ga4", "Aug 2026", "GA4 enquiries") }, { upliftPoints: 2, illustrativeAllowed: true });
    const t = (await renderCustomerPdf(input({ ...payload, opportunity: scenario }))).transcript;
    expect(t).toContain("PARTIAL SCENARIO - ESTIMATE");
    expect(t).toContain("about 40 additional enquiries a month");
    expect(t).toMatch(/A dollar figure needs enquiries that become patients and contribution per new patient/);
    expect(t).not.toMatch(/\$0\b/);
  });

  it("prints the formula only (no amount) when illustrations are disabled and no data is authorised", async () => {
    const payload = await buildPayload({ withPerformance: true });
    const scenario = buildOpportunityScenario({}, { upliftPoints: 2, illustrativeAllowed: false });
    const t = (await renderCustomerPdf(input({ ...payload, opportunity: scenario }))).transcript;
    expect(t).toContain("NO DOLLAR FIGURE - DATA NOT AUTHORISED");
    expect(t).not.toMatch(/\$\d/);
    expect(t).toContain("Discover Your Practice's Growth Opportunities");
  });
});
