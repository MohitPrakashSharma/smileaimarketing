import { PDFDocument } from "pdf-lib";
import type { V2ReportPayload } from "../report";
import { buildPerformanceView, metricsFor, googleChecksFor, testDateLabel, type PerfRow } from "../view/performanceView";
import { primaryAction, type FindingLike } from "../view/findingView";
import { buildBusinessMessage, plainEvidence } from "../view/message";
import { CUSTOMER_PILLARS, PILLAR_LABEL, BUCKET_LABEL, OWNER_LABEL } from "../view/pillars";
import { Flow, C, LEVEL_COLOR, LEVEL_LABEL, AUDIT_LEVEL_LABEL, SEVERITY_COLOR, googleLevel, auditLevel, loadFonts, dateLabel, pdfSafe, type Level, type PdfOutput } from "./layout";
import type { ReportPdfInput } from "./technicalPdf";
import type { LocalComparison, ComparisonEntry, ComparisonMetricKey } from "../competitors/types";
import { ILLUSTRATIVE_INPUTS, computeOpportunity } from "@/lib/opportunityCalculator";

/**
 * Customer report PDF — the version a practice owner reads. Same stored data
 * as the web report, presented in plain English:
 *
 *   1. Cover + personalised message      (business, date, scope, our score, message)
 *   2. Website health                      (our pillars; Google's five checks per tested page)
 *   3. Problems and recommendations        (the most consequential findings, one card each)
 *   4. Action plan                         (five priority actions — a checklist, not a repeat)
 *   4b. Local comparison                   (only when verified nearby practices were identified)
 *   4c. Financial opportunity              (illustrative scenario + link to the interactive calculator)
 *   5. Complete findings summary           (every stored finding, grouped by area)
 *
 * No raw HTML, check identifiers, code or long diagnostic lists here — those
 * live in the technical report, which our team provides after a website
 * review (the closing note links to the request form; there is no public
 * technical download). Every finding is accounted for; nothing is dropped to
 * save pages.
 *
 * `CUSTOMER_PDF_LAYOUT` is part of the stored file name — bump it whenever the
 * layout changes so cached files are regenerated.
 */

export const CUSTOMER_PDF_LAYOUT = "cust-r3"; // r3: local comparison + financial opportunity moved after the action plan; r2: consultation CTAs, technical report by request, evidence-led message

type Finding = V2ReportPayload["findings"][number];
const toLike = (f: Finding): FindingLike => ({ title: f.title, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, developerDetails: f.developerDetails as FindingLike["developerDetails"], recommendedFix: f.recommendedFix, whyItMatters: f.whyItMatters, device: f.device });
const pathOnly = (url: string) => {
  try {
    const p = new URL(url).pathname;
    return p === "/" ? "homepage" : p.replace(/\/$/, "");
  } catch {
    return url;
  }
};
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const SEVERITY_WORD: Record<string, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low", OPPORTUNITY: "Suggestion" };
const severityLevel = (s: string): Level | null => (s === "CRITICAL" || s === "HIGH" ? "attention" : s === "MEDIUM" ? "opportunity" : null);

/** Plain-language "what we found" for a finding: measurement + the pages it was seen on (paths only, capped). */
function whatWeFound(f: Finding, pagesCrawled: number): { measured: string; pages: string } {
  const raw = plainEvidence({ ...f, developerDetails: f.developerDetails as FindingLike["developerDetails"] }, pagesCrawled);
  // Performance findings group several checks; say so, so "across 4 pages" and "affects 5 pages" read consistently.
  const related = f.pillar === "PERFORMANCE" ? (f.developerDetails as FindingLike["developerDetails"] | null)?.filter((d) => d.affectedPageCount > 0).length ?? 0 : 0;
  const withNote = related > 1 ? `${raw.replace(/[.!?]$/, "")} (${related - 1} related check${related === 2 ? "" : "s"} also failed)` : raw;
  const measured = /[.!?]$/.test(withNote) ? withNote : `${withNote.charAt(0).toUpperCase()}${withNote.slice(1)}.`;
  const urls = [...new Set(f.affectedUrls.map(pathOnly))];
  const shown = urls.slice(0, 4);
  const pages = urls.length ? `${shown.join(", ")}${urls.length > shown.length ? ` and ${urls.length - shown.length} more` : ""}` : "";
  return { measured, pages };
}

/** Fix lines without developer-only phrasing (code, selectors, HTTP headers stay in the technical report). */
function ownerFixLines(f: Finding): string[] {
  const lines = f.recommendedFix
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter((l) => l && !/[<>{}`]|Cache-Control|@font-face|fetchpriority|srcset|<link|rel=|\.css|\.js/i.test(l));
  // The intro line and a bullet often say the same thing — keep the first phrasing only
  // (two lines sharing more than half of their meaningful words count as the same advice).
  const words = (l: string) => new Set(l.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter((w) => w.length > 3));
  const kept: Set<string>[] = [];
  return lines.filter((l) => {
    const w = words(l);
    const dup = kept.some((k) => {
      let common = 0;
      for (const x of w) if (k.has(x)) common++;
      return common / Math.max(1, Math.min(w.size, k.size)) > 0.5;
    });
    if (!dup) kept.push(w);
    return !dup;
  });
}
const clean = (s: string) => s.replace(/`/g, "").replace(/<([a-z-]+)>/g, "$1"); // Lighthouse titles quote tags in markdown — plain words for the owner

/** The one conversion block in the customer PDF: a boxed invitation to review the priority fixes with our team (existing consultation page). */
function consultationCta(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, input: ReportPdfInput) {
  const pad = 12;
  const inner = () => {
    fl.text("Let's Review Your Website's Priority Fixes", { font: f.bold, size: 13, color: C.dark, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
    fl.gap(3);
    fl.text("Book a website review with our team to understand the findings and discuss which improvements to prioritize. Fifteen minutes, no obligation — you leave knowing what to fix first.", { size: 9.5, color: C.secondary, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
    fl.gap(5);
    fl.link("Book a website review", input.consultationUrl, { size: 10.5, x: fl.left + pad });
    fl.text(input.consultationUrl, { size: 7.5, color: C.muted, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
  };
  fl.keepTogether(() => {
    // Box first (pdf-lib paints in call order), sized from a dry run of the content.
    const h = fl.measure(inner) + pad * 2;
    if (!fl.dryRun) fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: fl.usable, height: h, borderColor: C.accent, borderWidth: 0.8, color: C.accentSoft });
    fl.y -= pad;
    inner();
    fl.y -= pad;
  });
}

/** Local comparison, adapted for print: one row per practice with the five measured columns, the evidence-backed gaps, the method note and a CTA. Only called when the comparison exists. */
function localComparisonSection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, cmp: LocalComparison, input: ReportPdfInput) {
  const cols: ComparisonMetricKey[] = ["performanceScore", "lcpMs", "accessibility", "bestPractices", "seo"];
  const colLabel: Record<ComparisonMetricKey, string> = { performanceScore: "Performance", lcpMs: "Main content", accessibility: "Accessibility", bestPractices: "Best Practices", seo: "Google SEO" };
  const fmt = (key: ComparisonMetricKey, v: number | null) => (v === null ? "-" : key === "lcpMs" ? `${(v / 1000).toFixed(1)} s` : `${v}/100`);
  const nameW = 170;
  const colW = (fl.usable - nameW) / cols.length;
  // Fit a string to the name column by measured width, ending with an ellipsis if needed.
  const fit = (str: string, font: typeof f.bold, size: number, maxW = nameW - 8) => {
    let t = pdfSafe(str);
    if (font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) t = t.slice(0, -1);
    return pdfSafe(`${t.trimEnd()}…`);
  };
  fl.section(cmp.heading, "See how your website compares with other dental practices serving your area. Same Google PageSpeed test, same device (mobile), same page (the homepage). Website measurements only - not rankings, patient numbers or how well a practice is doing.");
  const rows: Array<{ label: string; sub: string | null; entry: ComparisonEntry }> = [{ label: `${cmp.practice.name} (you)`, sub: cmp.practice.domain, entry: cmp.practice }, ...cmp.competitors.map((c) => ({ label: c.name, sub: [c.domain, c.relevance].filter(Boolean).join(" · "), entry: c }))];
  fl.keepTogether(() => {
    // header
    const top = fl.y;
    if (!fl.dryRun) {
      fl.page.drawText("PRACTICE", { x: fl.left, y: top - 8, size: 6.5, font: f.bold, color: C.muted });
      cols.forEach((key, i) => fl.page.drawText(pdfSafe(colLabel[key].toUpperCase()), { x: fl.left + nameW + i * colW, y: top - 8, size: 6.5, font: f.bold, color: C.muted }));
    }
    fl.y = top - 12;
    fl.rule();
    for (const r of rows) {
      const y0 = fl.y;
      const m = r.entry.measurement;
      const ok = m?.status === "ok";
      if (!fl.dryRun) {
        fl.page.drawText(fit(r.label, f.bold, 8.5), { x: fl.left, y: y0 - 10, size: 8.5, font: f.bold, color: r.entry === cmp.practice ? C.accent : C.ink });
        if (r.sub) fl.page.drawText(fit(r.sub, f.regular, 6.5), { x: fl.left, y: y0 - 19, size: 6.5, font: f.regular, color: C.muted });
        cols.forEach((key, i) => {
          const v = ok ? fmt(key, m![key]) : "unavailable";
          fl.page.drawText(v, { x: fl.left + nameW + i * colW, y: y0 - 10, size: ok && m![key] !== null ? 9 : 7.5, font: ok && m![key] !== null ? f.bold : f.regular, color: ok && m![key] !== null ? C.ink : C.faint });
        });
        fl.transcript.push(`${r.label}: ${cols.map((key) => `${colLabel[key]} ${ok ? fmt(key, m![key]) : "unavailable"}`).join(", ")}`);
      }
      fl.y = y0 - 24;
      fl.rule();
    }
  });
  fl.gap(4);
  const adv = cmp.gaps.filter((g) => g.direction === "competitor_better");
  const str = cmp.gaps.filter((g) => g.direction === "practice_better");
  if (adv.length) {
    fl.text("Where nearby practices measured better", { font: f.bold, size: 9.5, color: C.dark });
    for (const g of adv) fl.text(`• ${g.sentence}`, { size: 8.5, color: C.secondary });
    fl.gap(3);
  }
  if (str.length) {
    fl.text("Where your practice measured better", { font: f.bold, size: 9.5, color: C.dark });
    for (const g of str) fl.text(`• ${g.sentence}`, { size: 8.5, color: C.secondary });
    fl.gap(3);
  }
  if (!cmp.gaps.length) fl.text("No difference large enough to call out on the metrics that could be measured.", { size: 8.5, color: C.secondary });
  if (cmp.narrative) {
    fl.gap(3);
    fl.text(cmp.narrative.text, { size: 9, color: C.ink });
    fl.text("Explanation written from the measurements above; every number is from the data.", { size: 7, color: C.muted });
  }
  fl.gap(4);
  fl.link("See How Your Practice Can Close the Gap", input.consultationUrl, { size: 10 });
  fl.text("Book a website review and we will go through these gaps with you and what it would take to close them.", { size: 8.5, color: C.secondary });
  fl.gap(4);
  fl.text(`How this comparison was made: ${cmp.method}`, { size: 7.5, color: C.muted });
  fl.text(cmp.attribution, { size: 7.5, color: C.muted });
}

/**
 * Financial opportunity, for print. The audit measures the website, not the
 * practice's traffic or bookings, so there are no verified inputs to use: the
 * page explains the maths, shows one clearly labelled illustrative scenario,
 * and links to the interactive calculator in the online report. Nothing here
 * is presented as a measured loss.
 */
function financialOpportunitySection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, input: ReportPdfInput) {
  const cad = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
  const ex = ILLUSTRATIVE_INPUTS;
  const r = computeOpportunity({ monthlyVisitors: Number(ex.monthlyVisitors), currentRate: Number(ex.currentRate), targetRate: Number(ex.targetRate), patientRate: Number(ex.patientRate), contribution: Number(ex.contribution) });
  fl.section("What could your website be costing you?", "The findings in this report are verified measurements of your website. This section is different: it is a what-if. It estimates what improving your website's enquiry rate could be worth, using numbers only you have - visitors, enquiry rate and what a new patient is worth to your practice.");
  fl.text("How it is worked out", { font: f.bold, size: 9.5, color: C.dark });
  fl.text("Additional enquiries per month = monthly visitors × (improved enquiry rate minus current enquiry rate). Additional patients = additional enquiries × the share of enquiries that become patients. Potential additional contribution = additional patients × contribution per new patient. Per day = monthly ÷ 30.", { size: 8.5, color: C.secondary });
  fl.gap(5);
  const pad = 10;
  const inner = () => {
    fl.text("ILLUSTRATIVE SCENARIO - NOT YOUR FIGURES", { font: f.bold, size: 7, color: C.accent, x: fl.left + pad });
    fl.gap(2);
    fl.text(`Example inputs: ${Number(ex.monthlyVisitors).toLocaleString("en-CA")} visitors a month · enquiry rate ${ex.currentRate}% today, ${ex.targetRate}% improved · ${ex.patientRate}% of enquiries become patients · ${cad(Number(ex.contribution))} contribution per new patient.`, { size: 8.5, color: C.ink, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
    fl.gap(2);
    fl.text(`Result: about ${r.additionalEnquiries.toLocaleString("en-CA", { maximumFractionDigits: 1 })} additional enquiries and ${r.additionalPatients.toLocaleString("en-CA", { maximumFractionDigits: 1 })} additional patients a month - a potential ${cad(r.monthlyContribution)} a month (${cad(r.dailyContribution)} a day).`, { font: f.bold, size: 9.5, color: C.dark, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
    fl.gap(2);
    fl.text("These example numbers are placeholders chosen to show the maths. They are not benchmarks, not measurements from this audit and say nothing about your practice.", { size: 7.5, color: C.muted, x: fl.left + pad, maxWidth: fl.usable - pad * 2 });
  };
  fl.keepTogether(() => {
    const h = fl.measure(inner) + pad * 2;
    if (!fl.dryRun) fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: fl.usable, height: h, borderColor: C.border, borderWidth: 0.8, color: C.surface });
    fl.y -= pad;
    inner();
    fl.y -= pad;
  });
  fl.gap(5);
  fl.link("Run the calculator with your own numbers", `${input.reportUrl}#opportunity`, { size: 10 });
  fl.text("Enter your visitors, enquiry rate and patient value in the interactive calculator in your online report. Your numbers stay in your browser - they are not stored or sent to us.", { size: 8.5, color: C.secondary });
  fl.gap(3);
  fl.text("This audit identifies verified problems on your website and listing. It does not prove that fixing them will produce the figures above - those depend on your own numbers and on what you change. No result here is a measured loss or a forecast.", { size: 7.5, color: C.muted });
}

export async function renderCustomerPdf(input: ReportPdfInput): Promise<PdfOutput> {
  const { payload, business } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`SEO Audit — ${business.name}`);
  doc.setAuthor("Smile AI Marketing");
  doc.setCreationDate(input.completedAt);
  const f = await loadFonts(doc);
  const date = dateLabel(input.completedAt);
  const fl = new Flow(doc, f, { business: business.name, date, url: input.reportUrl, kind: "SEO AUDIT" });
  const scores = payload.scores;
  const findings = payload.findings;
  const sc = payload.severityCounts;
  const pagesCrawled = ((payload.crawlStats as { pagesCrawled?: number } | null)?.pagesCrawled ?? 0) as number;
  const checksRun = payload.checks.filter((c) => c.status === "PASS" || c.status === "FAIL").length;
  const rows = payload.performance as PerfRow[];
  const view = buildPerformanceView(rows);
  const message = buildBusinessMessage({ businessName: business.name, website: business.website, customersWord: business.customersWord, pagesCrawled, checksRun, scores, severityCounts: sc, findings: findings.map((x) => ({ ...x, developerDetails: x.developerDetails as FindingLike["developerDetails"] })), performance: rows });

  // ───────── 1. Cover + personalised message ─────────
  fl.gap(6);
  fl.text("SEO AUDIT REPORT", { font: f.bold, size: 8, color: C.accent });
  fl.gap(4);
  fl.text(business.name, { font: f.bold, size: 24, color: C.dark, lineHeight: 28 });
  fl.text(`${input.headline.line1} ${input.headline.line2}`, { font: f.bold, size: 12, color: C.secondary });
  fl.gap(6);
  fl.text(`${business.website}${business.city ? ` · ${business.city}` : ""} · Audited ${date}`, { size: 9.5, color: C.secondary });
  const scopeBits = [`${pagesCrawled} page${pagesCrawled === 1 ? "" : "s"} crawled`, `${checksRun} checks`];
  if (view.pages.length) scopeBits.push(`Google PageSpeed on ${view.pages.length} page${view.pages.length === 1 ? "" : "s"}`);
  fl.text(`Scope: ${scopeBits.join(" · ")}`, { size: 9.5, color: C.secondary });
  fl.gap(14);
  {
    const overall = scores?.overall ?? null;
    const level = overall === null ? null : auditLevel(overall);
    const r = 36;
    const top = fl.y;
    fl.ring(fl.left + r + 6, top - r - 4, r, overall, level, { stroke: 7, numberSize: 27, caption: "SEO health" });
    const x = fl.left + r * 2 + 28;
    fl.text(overall === null ? "Overall SEO health: not measured" : `Overall SEO health: ${overall}/100 — ${AUDIT_LEVEL_LABEL[level!]}`, { x, font: f.bold, size: 12 });
    fl.text("Our audit score. It starts at 100 and loses points for every verified issue across the crawled pages. This is not a Google score — Google's own checks are on the next page.", { x, size: 8.5, color: C.muted });
    fl.gap(6);
    const crit = sc.CRITICAL ?? 0;
    const high = sc.HIGH ?? 0;
    const stats: Array<[string, string]> = [[String(findings.length), "verified findings"], [String(crit), crit === 1 ? "critical issue" : "critical issues"], [String(high), "high priority"], [String((sc.MEDIUM ?? 0) + (sc.LOW ?? 0)), "medium & low"]];
    const w = (fl.right - x) / 4;
    const sy = fl.y;
    stats.forEach(([v, l], i) => {
      if (!fl.dryRun) {
        fl.page.drawText(v, { x: x + i * w, y: sy - 16, size: 16, font: f.bold, color: i === 1 && crit ? C.attention : C.ink });
        fl.page.drawText(pdfSafe(l), { x: x + i * w, y: sy - 27, size: 7, font: f.regular, color: C.muted });
      }
      fl.transcript.push(`${v} ${l}`);
    });
    fl.y = Math.min(fl.y - 34, top - (r * 2 + 30));
  }
  fl.gap(10);
  fl.section(message.heading);
  for (const p of message.paragraphs) {
    fl.text(p, { size: 10, lineHeight: 14.5 });
    fl.gap(5);
  }

  // ───────── 2. Website health ─────────
  fl.newPage();
  fl.section("Website health", `Two different measurements, side by side: our SEO audit (all crawled pages, ${CUSTOMER_PILLARS.length} areas) and Google's own five checks (one page and one device per test).`);
  fl.text("Our SEO audit — by area", { font: f.bold, size: 11, color: C.dark });
  fl.gap(4);
  for (const p of CUSTOMER_PILLARS) {
    const score = scores ? scores[p.key] : null;
    const mine = findings.filter((x) => x.pillar === p.pillar);
    const level = score === null ? null : auditLevel(score);
    fl.keepTogether(() => {
      const top = fl.y;
      fl.text(p.label, { font: f.bold, size: 10, maxWidth: fl.usable - 150 });
      fl.text(score === null ? p.notMeasured(business.city) : mine.length ? `${mine.length} finding${mine.length === 1 ? "" : "s"} — ${mine.slice(0, 2).map((x) => lower(x.title)).join("; ")}${mine.length > 2 ? "; and more" : "."}` : "No problems found in the checks we ran.", { size: 8.5, color: C.muted, maxWidth: fl.usable - 150 });
      if (!fl.dryRun) {
        fl.page.drawText(score === null ? "Not measured" : `${score}/100`, { x: fl.right - 140, y: top - 12, size: 12, font: f.bold, color: score === null ? C.faint : C.ink });
        if (level) fl.pill(AUDIT_LEVEL_LABEL[level], level, fl.right - 72, top - 1);
        fl.transcript.push(`${p.label}: ${score === null ? "Not measured" : `${score}/100 (${AUDIT_LEVEL_LABEL[level!]})`}`);
      }
      fl.gap(2);
      fl.rule();
      fl.gap(3);
    });
  }
  fl.gap(8);
  fl.text("Google's website checks", { font: f.bold, size: 11, color: C.dark });
  const perfStage = payload.progress?.stages.find((s) => s.key === "performance");
  if (!view.okRuns) {
    fl.text(rows.length ? "Google PageSpeed Insights could not test this site during the audit, so Google's checks are not available for this report and do not affect your score." : `Google's checks were not run for this audit${perfStage?.detail ? ` (${perfStage.detail})` : ""}.`, { size: 9.5, color: C.muted });
  } else {
    fl.text("Google tests one page on one device at a time. Performance, Accessibility, Best Practices and Google SEO are 0–100 scores; Agentic Browsing is a short pass/fail checklist for AI assistants that Google marks as experimental. Google's SEO check covers ten technical basics — it is not the same as our SEO audit above.", { size: 8.5, color: C.muted });
    fl.gap(6);
    let siteWideField = false;
    for (const pg of view.pages) {
      for (const device of ["mobile", "desktop"] as const) {
        const row = pg[device];
        if (!row) continue;
        const checks = googleChecksFor(row);
        const when = testDateLabel(row.analysisUtc);
        fl.keepTogether(() => {
          fl.text(`${pg.path} · ${device === "mobile" ? "Mobile" : "Desktop"}${when ? ` · tested ${when}` : ""}`, { font: f.bold, size: 10 });
          fl.gap(6);
          const slot = fl.usable / 5;
          const r = 17;
          const top = fl.y;
          checks.forEach((c, i) => {
            const cx = fl.left + slot * i + slot / 2;
            const cy = top - r - 2;
            if (c.kind === "score") fl.ring(cx, cy, r, c.available ? c.score : null, c.available && c.score !== null ? googleLevel(c.score) : null, { stroke: 4, numberSize: 12 });
            else if (!fl.dryRun) {
              const lvl: Level | null = c.available ? (c.passed === c.applicable ? "healthy" : "opportunity") : null;
              fl.page.drawCircle({ x: cx, y: cy, size: r, borderColor: lvl ? LEVEL_COLOR[lvl] : C.track, borderWidth: 4 });
              const lbl = c.available ? `${c.passed}/${c.applicable}` : "-";
              fl.page.drawText(lbl, { x: cx - f.bold.widthOfTextAtSize(lbl, 10) / 2, y: cy - 2, size: 10, font: f.bold, color: c.available ? C.ink : C.faint });
              fl.page.drawText("PASSED", { x: cx - f.bold.widthOfTextAtSize("PASSED", 4.5) / 2, y: cy - 9, size: 4.5, font: f.bold, color: C.muted });
            }
            if (!fl.dryRun) {
              const name = pdfSafe(c.label);
              fl.page.drawText(name, { x: cx - f.bold.widthOfTextAtSize(name, 7.5) / 2, y: cy - r - 12, size: 7.5, font: f.bold, color: C.ink });
              const status = c.kind === "score" ? (c.available ? LEVEL_LABEL[googleLevel(c.score!)] : "Not collected") : c.available ? (c.passed === c.applicable ? "All passed" : "Some failed") : "Not collected";
              fl.page.drawText(status, { x: cx - f.regular.widthOfTextAtSize(status, 6.5) / 2, y: cy - r - 20, size: 6.5, font: f.regular, color: C.muted });
              fl.transcript.push(`${c.label}: ${c.kind === "score" ? (c.available ? `${c.score}/100 (${status})` : "not collected") : c.available ? `${c.passed} of ${c.applicable} checks passed` : "not collected"}`);
            }
          });
          fl.y = top - (r * 2 + 30);
          // one plain-English line per page × device
          const perf = checks[0];
          const m = perf.available ? Object.fromEntries(metricsFor(row).map((x) => [x.key, x])) : null;
          const bits: string[] = [];
          if (perf.available) {
            if (m?.lcp?.source === "field" && m.lcp.fieldLevel === "origin") siteWideField = true;
            const lcpSrc = m?.lcp?.source === "field" ? (m.lcp.fieldLevel === "origin" ? " for real visitors (site-wide figure — see note below)" : " for real visitors of this page (Chrome UX Report)") : " in Google's simulated Lighthouse test";
            bits.push(`Google scores this page ${perf.score}/100 for speed on ${device} (Lighthouse lab test)${m?.lcp?.value != null ? ` — main content appears after ${m.lcp.display}${lcpSrc}; Google's target is 2.5 s` : ""}`);
          }
          else bits.push(`Google could not measure speed for this page on ${device}`);
          const cats = checks.slice(1, 4).filter((c) => c.available);
          if (cats.length) {
            const fails = cats.flatMap((c) => c.failed.map((a) => clean(a.title)));
            bits.push(fails.length ? `Google's other checks flagged: ${fails.slice(0, 4).join("; ")}${fails.length > 4 ? "; and more" : ""}` : "Google's accessibility, best-practice and basic SEO checks all passed");
          }
          const ag = checks[4];
          if (ag.available && ag.applicable !== null && ag.passed !== ag.applicable) bits.push(`Agentic Browsing: ${ag.applicable - (ag.passed ?? 0)} of ${ag.applicable} checks failed`);
          fl.text(bits.map((b) => (/[.!?]$/.test(b) ? b : `${b}.`)).join(" "), { size: 8.5, color: C.secondary });
          fl.gap(8);
        });
      }
    }
    if (siteWideField) fl.text("Note on real-visitor figures: Google's Chrome UX Report only has site-wide data for this site, so the same real-visitor timing is reported for every page tested. The performance score and the other timings are Google's per-page lab measurements.", { size: 8, color: C.muted });
    if (view.failedRuns.length) fl.text(`${view.failedRuns.length} of ${view.totalRuns} Google test runs could not complete and are simply not shown.`, { size: 8, color: C.muted });
    if (scores?.performance != null) fl.text(`Why our Performance score (${scores.performance}/100) is lower than Google's: our score deducts points for every verified performance issue across all ${view.pages.length} tested page${view.pages.length === 1 ? "" : "s"} on both devices; Google's number is for one page on one device.`, { size: 8, color: C.muted });
  }

  // ───────── 3. Problems and recommendations ─────────
  const featured = (() => {
    const byPriority = findings.slice(0, 5);
    const criticals = findings.filter((x) => x.severity === "CRITICAL" && !byPriority.includes(x));
    return [...byPriority, ...criticals];
  })();
  fl.ensure(220);
  fl.section("Problems and recommendations", `The ${featured.length} findings that matter most, most serious first. For each: what we measured, why it deserves attention, and what to do. Every one is a verified measurement from this audit; all ${findings.length} findings are listed in the summary at the end.`);
  featured.forEach((fd, i) => {
    const like = toLike(fd);
    const { measured, pages } = whatWeFound(fd, pagesCrawled);
    const fixes = ownerFixLines(fd);
    fl.keepTogether(() => {
      const top = fl.y;
      const startPage = fl.page;
      const w = fl.pill(SEVERITY_WORD[fd.severity] ?? fd.severity, severityLevel(fd.severity), fl.left, top);
      if (!fl.dryRun) fl.page.drawText(pdfSafe(`${PILLAR_LABEL[fd.pillar] ?? fd.pillar} · affects ${fd.affectedPageCount} page${fd.affectedPageCount === 1 ? "" : "s"} · ${fd.owner === "developer" ? "needs a developer" : fd.owner === "owner" ? "you can do this yourself" : "we can handle this"}`), { x: fl.left + w + 6, y: top - 8.4, size: 7.5, font: f.regular, color: C.muted });
      fl.y = top - 14;
      fl.text(`${i + 1}. ${fd.title}`, { font: f.bold, size: 12 });
      fl.gap(2);
      fl.kv("What we found", `${measured}${pages ? ` Seen on: ${pages}.` : ""}`, { labelWidth: 78, size: 9.5 });
      fl.kv("Why it matters", fd.whyItMatters, { labelWidth: 78, size: 9.5 });
      fl.kv("What to do", fixes[0] ?? primaryAction(like), { labelWidth: 78, size: 9.5 });
      for (const line of fixes.slice(1, 4)) fl.text(`• ${line}`, { size: 9, x: fl.left + 78, color: C.secondary });
      fl.text(`Priority: ${BUCKET_LABEL[fd.bucket] ?? fd.bucket} · effort ${fd.effort}/5${fd.severity === "CRITICAL" && fd.effort >= 4 ? " · a larger job, but critical — start it now" : ""}`, { size: 8, color: C.muted, x: fl.left + 78 });
      if (!fl.dryRun && fl.page === startPage) fl.page.drawRectangle({ x: fl.left - 8, y: fl.y - 2, width: 2.5, height: top - fl.y + 2, color: SEVERITY_COLOR[fd.severity] ?? C.muted });
      fl.gap(8);
      fl.rule();
      fl.gap(8);
    });
  });
  if (!featured.length) fl.text("Nothing crossed our thresholds — the site is in good shape on the checks we ran.", { size: 10 });

  // ───────── 4. Action plan ─────────
  const plan = findings.slice(0, 5);
  fl.section("Action plan", "Where to start: the same five findings as a checklist, most serious first. Quick wins are marked so you can bank them early; larger jobs are flagged for whoever maintains the site.");
  plan.forEach((fd, i) => {
    fl.keepTogether(() => {
      const top = fl.y;
      if (!fl.dryRun) {
        fl.page.drawCircle({ x: fl.left + 9, y: top - 9, size: 9, color: C.accentSoft });
        fl.page.drawText(String(i + 1), { x: fl.left + 9 - f.bold.widthOfTextAtSize(String(i + 1), 9) / 2, y: top - 12.2, size: 9, font: f.bold, color: C.accent });
      }
      fl.text(fd.title, { font: f.bold, size: 10.5, x: fl.left + 26 });
      fl.text(`${primaryAction(toLike(fd))} ${OWNER_LABEL[fd.owner] ? `(${OWNER_LABEL[fd.owner]}${fd.effort >= 4 ? "; a larger job" : ""})` : ""}`, { size: 9, x: fl.left + 26, color: C.secondary });
      fl.text(`${BUCKET_LABEL[fd.bucket] ?? fd.bucket}`, { size: 8, x: fl.left + 26, color: C.muted });
      fl.gap(6);
    });
  });
  if (!plan.length) fl.text("No actions required from this audit.", { size: 10 });
  fl.gap(4);
  fl.text("Next steps: work through the list top to bottom and re-run the audit once the first two items are done. Each item above stays a problem for every visitor until it is fixed. Whoever maintains the website will want the full technical report — request it below and our team will provide it after the review.", { size: 9, color: C.secondary });

  // ───────── 4b. Local comparison (only with verified nearby practices) ─────────
  if (payload.competitors) {
    fl.ensure(260);
    localComparisonSection(fl, f, payload.competitors, input);
  }

  // ───────── 4c. Financial opportunity (illustrative + interactive link) ─────────
  fl.ensure(240);
  financialOpportunitySection(fl, f, input);

  fl.gap(8);
  consultationCta(fl, f, input);

  // ───────── 5. Complete findings summary ─────────
  fl.section(`All ${findings.length} findings`, "Everything the audit verified, grouped by area. Full measurements, affected URLs and developer instructions for each item are in the technical report and the online report.");
  for (const p of CUSTOMER_PILLARS) {
    const mine = findings.filter((x) => x.pillar === p.pillar);
    if (!mine.length) continue;
    fl.ensure(70);
    fl.text(`${p.label} (${mine.length})`, { font: f.bold, size: 10, color: C.dark });
    fl.gap(3);
    for (const fd of mine) {
      const { measured, pages } = whatWeFound(fd, pagesCrawled);
      fl.keepTogether(() => {
        const top = fl.y;
        const w = fl.pill(SEVERITY_WORD[fd.severity] ?? fd.severity, severityLevel(fd.severity), fl.left, top, 6.5);
        fl.y = top;
        fl.text(fd.title, { font: f.bold, size: 9.5, x: fl.left + w + 6 });
        fl.text(`${measured}${pages ? ` · ${pages}` : ""}`, { size: 8.5, color: C.secondary, x: fl.left + w + 6 });
        fl.text(`${primaryAction(toLike(fd)).replace(/[:;,]\s*$/, "")} · ${BUCKET_LABEL[fd.bucket]?.toLowerCase() ?? fd.bucket} · ${OWNER_LABEL[fd.owner] ?? fd.owner}`, { size: 8, color: C.muted, x: fl.left + w + 6 });
        fl.gap(5);
      });
    }
    fl.gap(4);
  }

  fl.gap(8);
  fl.rule();
  fl.gap(6);
  fl.link(`Online report (interactive, with every measurement): ${input.reportUrl}`, input.reportUrl, { size: 9 });
  fl.gap(2);
  fl.link("Request Your Full Technical Report", input.technicalReportRequestUrl, { size: 9.5 });
  fl.text("The full technical report — every measurement, affected URL and developer instruction — is provided by our team after a website review, not sent automatically. Use the link above to book the review and request it. This report is based only on data collected during the audit; scores describe how the site measured on the audit date and are not predictions of rankings, traffic or revenue.", { size: 8, color: C.muted });

  fl.finish();
  const bytes = await doc.save();
  return { bytes, pageCount: fl.pages.length, transcript: fl.transcript.join("\n") };
}
