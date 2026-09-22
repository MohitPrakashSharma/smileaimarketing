import { PDFDocument, type RGB } from "pdf-lib";
import type { V2ReportPayload } from "../report";
import { buildBriefing, type BriefingFinding, type ReportBriefing } from "../view/briefing";
import type { FindingLike } from "../view/findingView";
import { Flow, C, SEVERITY_COLOR, googleLevel, loadFonts, dateLabel, pdfSafe, type PdfOutput } from "./layout";
import { buildPerformanceView, googleChecksFor, testDateLabel, type PerfRow } from "../view/performanceView";
import type { ReportPdfInput } from "./technicalPdf";
import type { LocalComparison, ComparisonEntry, ComparisonMetricKey } from "../competitors/types";
import { METRIC_LABEL } from "../competitors/view";
import { INPUT_LABEL, type OpportunityInputKey, type OpportunityScenario, type SourcedValue } from "../opportunity/types";

/**
 * Customer report PDF — a business briefing a practice owner can read in a
 * minute and a half, in the same order as the web report:
 *
 *   A  Executive briefing            headline, ≤60-word summary, four numbers,
 *                                     Google's PageSpeed rings for the homepage
 *   B  Your three biggest problems    measured → what it can mean → do this
 *   C  What could this be worth?      the automated opportunity scenario
 *   D  Your local competitors         verified side-by-side measurements
 *   E  Your next three actions
 *   F  One closing consultation CTA
 *
 * Sections A, B and E come from `buildBriefing`, the same function the web
 * report calls, so the two documents always state the same headline, summary,
 * problems, counts and actions; C and D print the same scenario and comparison
 * objects the web renders. No raw HTML, check identifiers, per-page API errors
 * or URL inventories appear here — that evidence lives in the technical report,
 * which our team still provides by hand after a website review.
 *
 * `CUSTOMER_PDF_LAYOUT` is part of the stored file name — bump it whenever the
 * layout changes so cached files are regenerated.
 */

export const CUSTOMER_PDF_LAYOUT = "cust-r6"; // r6: business briefing (A-F: three problems, three actions); r5: competitor call-out + website URLs; r4: automated financial scenario; r3: local comparison after the action plan

type Finding = V2ReportPayload["findings"][number];

const cad = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
const num = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 1 });

const toBriefingFinding = (f: Finding): BriefingFinding => ({
  id: f.id,
  title: f.title,
  pillar: f.pillar,
  severity: f.severity,
  bucket: f.bucket,
  owner: f.owner,
  effort: f.effort,
  affectedPageCount: f.affectedPageCount,
  detectedValue: f.detectedValue,
  developerDetails: f.developerDetails as FindingLike["developerDetails"],
  recommendedFix: f.recommendedFix,
  whyItMatters: f.whyItMatters,
  device: f.device,
});

/** A boxed panel sized from a dry run of its own content (pdf-lib paints in call order). */
function panel(fl: Flow, pad: number, inner: () => void, o: { fill?: RGB; border?: RGB; bar?: boolean } = {}) {
  fl.keepTogether(() => {
    const h = fl.measure(inner) + pad * 2;
    if (!fl.dryRun) {
      fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: fl.usable, height: h, borderColor: o.border ?? C.border, borderWidth: 0.8, color: o.fill ?? C.surface });
      if (o.bar) fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: 3.5, height: h, color: C.accent });
    }
    fl.y -= pad;
    inner();
    fl.y -= pad;
  });
}


/**
 * Google's PageSpeed Insights scores for the homepage, as the rings the tool
 * itself shows. Drawn only from a stored "ok" run: when Google could not test
 * the site nothing is drawn, and no ring is ever invented.
 */
function googleRings(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, rows: PerfRow[]) {
  const view = buildPerformanceView(rows);
  const page = view.pages.find((p) => p.pageType === "home") ?? view.pages[0];
  const row = page?.mobile ?? page?.desktop ?? null;
  if (!row || row.status !== "ok") return;
  const scores = googleChecksFor(row).filter((c) => c.kind === "score" && c.available && c.score !== null);
  if (!scores.length) return;
  const device = page?.mobile ? "mobile" : "desktop";
  const date = testDateLabel(row.analysisUtc);
  fl.ensure(96);
  fl.text(`GOOGLE PAGESPEED INSIGHTS · HOMEPAGE · ${device.toUpperCase()}${date ? ` · TESTED ${date.toUpperCase()}` : ""}`, { font: f.bold, size: 6.5, color: C.secondaryAccent });
  fl.gap(4);
  const r = 22;
  const step = fl.usable / scores.length;
  const top = fl.y;
  scores.forEach((c, i) => {
    fl.ring(fl.left + step * i + r + 6, top - r - 2, r, c.score, googleLevel(c.score!), { stroke: 5, numberSize: 16, caption: c.label });
    fl.transcript.push(`${c.label}: ${c.score}/100 (Google, ${device})`);
  });
  fl.y = top - (r * 2 + 22);
  fl.gap(4);
}

// ───────── A. Executive briefing ─────────
function executiveBriefing(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, b: ReportBriefing, input: ReportPdfInput, date: string, perf: PerfRow[]) {
  fl.gap(4);
  fl.text("EXECUTIVE BRIEFING", { font: f.bold, size: 8, color: C.accent });
  fl.gap(3);
  fl.text(`${b.practice.name}${b.practice.city ? ` · ${b.practice.city}` : ""}`, { font: f.bold, size: 20, color: C.dark, lineHeight: 24 });
  fl.text(`${b.practice.domain} · Audited ${date}`, { size: 9, color: C.secondary });
  fl.gap(10);
  fl.text(b.headline, { font: f.bold, size: 17, color: C.dark, lineHeight: 21 });
  fl.gap(5);
  fl.text(b.summary, { size: 10.5, color: C.ink, lineHeight: 15 });
  if (!b.performanceMeasured) fl.text("Google PageSpeed could not test this site during the audit, so speed is not scored here.", { size: 8, color: C.muted });
  fl.gap(10);

  // Four numbers, evenly spaced: the score is one of them, not the story.
  const stats: Array<[string, string, string]> = [
    [b.stats.score === null ? "-" : String(b.stats.score), "Audit score", "out of 100"],
    [String(b.stats.findings), "Verified issues", `from ${b.stats.checksRun} checks`],
    [String(b.stats.criticalHigh), "Critical & high", `${b.stats.critical} critical · ${b.stats.high} high`],
    [String(b.stats.pagesCrawled), "Pages crawled", "this audit"],
  ];
  fl.keepTogether(() => {
    const h = 48;
    const w = fl.usable / stats.length;
    const top = fl.y;
    if (!fl.dryRun) {
      fl.page.drawRectangle({ x: fl.left, y: top - h, width: fl.usable, height: h, color: C.accentSoft, borderColor: C.accent, borderWidth: 0.8 });
      stats.forEach(([v, l, note], i) => {
        const x = fl.left + i * w + 12;
        fl.page.drawText(v, { x, y: top - 24, size: 18, font: f.bold, color: C.dark });
        fl.page.drawText(pdfSafe(l.toUpperCase()), { x, y: top - 34, size: 6.5, font: f.bold, color: C.accent });
        fl.page.drawText(pdfSafe(note), { x, y: top - 43, size: 6.5, font: f.regular, color: C.muted });
        fl.transcript.push(`${v} ${l} (${note})`);
        if (i > 0) fl.page.drawLine({ start: { x: fl.left + i * w, y: top - h + 8 }, end: { x: fl.left + i * w, y: top - 8 }, thickness: 0.5, color: C.accent });
      });
    }
    fl.y = top - h;
  });
  fl.gap(12);
  googleRings(fl, f, perf);
  if (b.stats.topProblem) {
    panel(fl, 10, () => {
      fl.text("MOST CONSEQUENTIAL PROBLEM", { font: f.bold, size: 6.5, color: C.accent, x: fl.left + 14, maxWidth: fl.usable - 26 });
      fl.gap(2);
      fl.text(b.stats.topProblem!, { font: f.bold, size: 11.5, color: C.dark, x: fl.left + 14, maxWidth: fl.usable - 26 });
    }, { bar: true });
  }
  fl.gap(8);
  fl.link(`Online report (interactive, with every measurement): ${input.reportUrl}`, input.reportUrl, { size: 8.5 });
}

// ───────── B. Three biggest problems ─────────
function problemsSection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, b: ReportBriefing) {
  if (!b.problems.length) {
    fl.section("Your biggest website problems", "Nothing crossed our thresholds in the checks we ran — there is no priority list this time.");
    return;
  }
  fl.section(`Your ${b.problems.length === 1 ? "biggest website problem" : `${b.problems.length} biggest website problems`}`, "Verified on your own pages: what we measured, what it can mean, and what to do about it.");
  b.problems.forEach((p, i) => {
    panel(fl, 10, () => {
      const x = fl.left + 14;
      const w = fl.usable - 26;
      // Severity keeps its own colour here: a critical finding must not read as "brand blue".
      fl.text(`${String(i + 1).padStart(2, "0")} · ${p.severityLabel.toUpperCase()} · ${p.area.toUpperCase()} · ${p.ownerLabel.toUpperCase()}`, { font: f.bold, size: 6.5, color: SEVERITY_COLOR[p.severity] ?? C.accent, x, maxWidth: w });
      fl.gap(2);
      fl.text(p.headline, { font: f.bold, size: 12.5, color: C.dark, x, maxWidth: w, lineHeight: 15 });
      fl.gap(4);
      const line = (label: string, body: string, color = C.ink) => {
        const lw = f.bold.widthOfTextAtSize(`${label} `, 8.5);
        const y0 = fl.y;
        if (!fl.dryRun) {
          fl.page.drawText(label, { x, y: y0 - 8.5, size: 8.5, font: f.bold, color: C.dark });
          fl.transcript.push(label);
        }
        fl.text(body, { size: 8.5, color, x: x + lw, maxWidth: w - lw, lineHeight: 12 });
        fl.gap(1.5);
      };
      line("Measured:", p.evidence);
      line("What it can mean:", p.implication, C.secondary);
      line("Do this:", p.action);
    }, { bar: true });
    fl.gap(5);
  });
  if (b.more.total > 0) {
    fl.gap(2);
    fl.keepTogether(() => {
      fl.text(`Also found: ${b.more.total} further finding${b.more.total === 1 ? "" : "s"} — ${b.more.byArea.map((a) => `${a.count} ${a.label.toLowerCase()}`).join(", ")}.`, { font: f.bold, size: 9, color: C.dark });
      if (b.more.titles.length) fl.text(`Including: ${b.more.titles.join("; ")}${b.more.total > b.more.titles.length ? "; and more" : ""}. Every one is listed with its full evidence in the technical report.`, { size: 8, color: C.muted });
    });
  }
}

// ───────── C. What could this be worth? ─────────
function opportunitySection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, sc: OpportunityScenario, input: ReportPdfInput) {
  const rateKeys: OpportunityInputKey[] = ["currentRate", "targetRate", "patientRate"];
  const fmtInput = (key: OpportunityInputKey, v: SourcedValue) => (rateKeys.includes(key) ? `${num(v.value * 100)}%` : key === "contribution" ? cad(v.value) : num(v.value));
  const sourceWord: Record<SourcedValue["source"], string> = { ga4: "Google Analytics", gsc: "Search Console", crm: "booking data", finance: "practice financials", practice_provided: "provided by the practice", assumption: "assumption", illustrative: "example" };
  const intro =
    sc.mode === "verified"
      ? `A scenario built from the data ${input.business.name} authorised, with one stated improvement assumption.`
      : sc.mode === "partial"
        ? `Built from the data ${input.business.name} authorised so far - only what that data supports is shown.`
        : sc.mode === "illustrative"
          ? "This audit measured the website, not your visitors, enquiries or income. Until those are shared, here is how the maths works on example numbers."
          : "This audit measured the website, not your visitors, enquiries or income - so no dollar figure is shown.";
  fl.section("What could this be worth?", intro);

  const tag = sc.illustrative ? "ILLUSTRATIVE EXAMPLE - NOT YOUR FIGURES" : sc.mode === "verified" ? "PRACTICE-SPECIFIC SCENARIO - ESTIMATE" : sc.mode === "partial" ? "PARTIAL SCENARIO - ESTIMATE" : "NO DOLLAR FIGURE - DATA NOT AUTHORISED";
  const used = (Object.keys(sc.inputs) as OpportunityInputKey[]).filter((k) => sc.inputs[k]);
  panel(
    fl,
    12,
    () => {
      const x = fl.left + 16;
      const w = fl.usable - 32;
      fl.text(tag, { font: f.bold, size: 7, color: C.accent, x, maxWidth: w });
      fl.gap(3);
      if (sc.illustrative) {
        // A labelled worked example: the same numbers for every practice, so they are never the headline.
        const bits: string[] = [];
        if (sc.figures.additionalEnquiries !== null) bits.push(`${num(sc.figures.additionalEnquiries)} additional enquiries a month`);
        if (sc.figures.additionalPatients !== null) bits.push(`${num(sc.figures.additionalPatients)} additional patients a month`);
        if (sc.figures.monthlyContribution !== null) bits.push(`${cad(sc.figures.monthlyContribution)} a month in additional contribution`);
        fl.text("How the maths works, on example numbers", { font: f.bold, size: 11, color: C.dark, x, maxWidth: w });
        fl.gap(2);
        if (bits.length) fl.text(`On the example inputs below, an enquiry rate lifted by two percentage points would mean ${bits.join(", ")}. These are placeholder numbers used to show the method - they are the same for every practice and say nothing about yours.`, { size: 9, color: C.ink, x, maxWidth: w });
        fl.gap(2);
        fl.text("Share your visitors, enquiry rate and what a new patient is worth in a website review and we will build this scenario with your figures.", { size: 8.5, color: C.secondary, x, maxWidth: w });
      } else if (sc.figures.monthlyContribution !== null) {
        fl.text(cad(sc.figures.monthlyContribution), { font: f.bold, size: 28, color: C.growth, x, maxWidth: w, lineHeight: 31 });
        fl.text(`Potential additional contribution a month under this scenario - about ${cad(sc.figures.dailyContribution!)} a day over 30 days.`, { size: 8.5, color: C.secondary, x, maxWidth: w });
        const bits: string[] = [];
        if (sc.figures.additionalEnquiries !== null) bits.push(`${num(sc.figures.additionalEnquiries)} additional enquiries a month`);
        if (sc.figures.additionalPatients !== null) bits.push(`${num(sc.figures.additionalPatients)} additional patients a month`);
        if (bits.length) fl.text(`From ${bits.join(" and ")}.`, { size: 8.5, color: C.ink, x, maxWidth: w });
      } else if (sc.figures.additionalEnquiries !== null) {
        fl.text(num(sc.figures.additionalEnquiries), { font: f.bold, size: 24, color: C.dark, x, maxWidth: w, lineHeight: 27 });
        fl.text(`Additional enquiries a month under this scenario. A dollar figure needs ${sc.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(" and ")} - not authorised yet, so none is shown.`, { size: 8.5, color: C.secondary, x, maxWidth: w });
      } else {
        fl.text("Additional enquiries a month = monthly visitors × (improved enquiry rate minus current enquiry rate); additional patients = enquiries × the share that become patients; contribution = patients × contribution per new patient.", { size: 9, color: C.ink, x, maxWidth: w });
        fl.gap(2);
        fl.text("Share your visitors, enquiry rate and what a new patient is worth in a website review and we will build the scenario with you.", { size: 8.5, color: C.secondary, x, maxWidth: w });
      }
      fl.gap(4);
      if (used.length) fl.text(`${sc.illustrative ? "Example inputs" : "Inputs used"}: ${used.map((k) => `${INPUT_LABEL[k].toLowerCase()} ${fmtInput(k, sc.inputs[k]!)} (${sourceWord[sc.inputs[k]!.source]}${sc.inputs[k]!.period ? `, ${sc.inputs[k]!.period}` : ""})`).join(" · ")}.`, { size: 7.5, color: C.muted, x, maxWidth: w });
      if (sc.periods.length) fl.text(`Measurement period: ${sc.periods.join("; ")}.`, { size: 7.5, color: C.muted, x, maxWidth: w });
      for (const a of sc.assumptions) fl.text(a, { size: 7.5, color: C.muted, x, maxWidth: w });
      fl.text(sc.disclaimer, { size: 7.5, color: C.muted, x, maxWidth: w });
    },
    { fill: C.accentSoft, border: C.accent },
  );
  fl.gap(4);
  fl.text("Method: one calculation for the whole report - additional enquiries a month = monthly visitors × (improved rate minus current rate); patients = enquiries × the share that become patients; contribution = patients × contribution per new patient; per day = monthly ÷ 30. No separate loss is added up per issue, and no figure here comes from the audit score, PageSpeed or the competitor measurements.", { size: 7.5, color: C.muted });
}

// ───────── D. Local competitors ─────────
function competitorsSection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, cmp: LocalComparison) {
  const cols: ComparisonMetricKey[] = ["performanceScore", "lcpMs", "accessibility", "bestPractices", "seo"];
  const colLabel: Record<ComparisonMetricKey, string> = { performanceScore: "Performance", lcpMs: "Main content", accessibility: "Accessibility", bestPractices: "Best practices", seo: "Google SEO" };
  const fmt = (key: ComparisonMetricKey, v: number | null) => (v === null ? "-" : key === "lcpMs" ? `${(v / 1000).toFixed(1)} s` : `${v}/100`);
  // Pending (never tested) and a genuine measurement failure are different states and are never conflated.
  const state = (e: ComparisonEntry) => (e.measurement?.status === "ok" ? "ok" : !e.measurement && !e.measuredAt ? "pending" : "failed");
  const leads = (key: ComparisonMetricKey, v: number | null, p: number | null | undefined) => (v === null || p === null || p === undefined ? false : key === "lcpMs" ? v < p : v > p);
  const advantages = cmp.gaps.filter((g) => g.direction === "competitor_better");
  const measured = cmp.competitors.filter((c) => state(c) === "ok").length;
  // The same selection the web report makes: the practices that measured ahead on at least one
  // of the five measures, plus any still being analysed; when none are ahead, every measured
  // practice is listed instead.
  const ahead = new Set(advantages.map((g) => g.competitor));
  const pending = cmp.competitors.filter((c) => state(c) === "pending");
  const shown = ahead.size > 0 ? cmp.competitors.filter((c) => ahead.has(c.name) || state(c) === "pending") : cmp.competitors;
  const shownNames = new Set(shown.map((c) => c.name));
  const strengths = cmp.gaps.filter((g) => g.direction === "practice_better" && shownNames.has(g.competitor));
  const heading = advantages.length > 0 ? "Nearby practices have measurable website advantages" : "How your website compares nearby";

  const nameW = 172;
  const colW = (fl.usable - nameW) / cols.length;
  const fit = (str: string, font: typeof f.bold, size: number, maxW = nameW - 10) => {
    let t = pdfSafe(str);
    if (font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) t = t.slice(0, -1);
    return pdfSafe(`${t.trimEnd()}…`);
  };
  const shownUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  const lead =
    ahead.size > 0
      ? `${ahead.size} of the ${measured} nearby ${measured === 1 ? "practice" : "practices"} we measured scored ahead of your homepage on at least one of the five measures - those are the ones below.${pending.length ? ` ${pending.length} more ${pending.length === 1 ? "is" : "are"} still being analysed.` : ""}`
      : `${measured} of ${cmp.competitors.length} nearby ${cmp.competitors.length === 1 ? "practice" : "practices"} could be measured.`;
  fl.section(heading, `${lead} Same Google PageSpeed test: mobile, homepage, the test used on your site. Website measurements only: not rankings, patient numbers or how well a practice is doing.`);

  const rows: Array<{ label: string; entry: ComparisonEntry }> = [{ label: `${cmp.practice.name} (you)`, entry: cmp.practice }, ...shown.map((c) => ({ label: c.name, entry: c }))];
  fl.keepTogether(() => {
    const top = fl.y;
    if (!fl.dryRun) {
      fl.page.drawText("PRACTICE / WEBSITE", { x: fl.left, y: top - 8, size: 6.5, font: f.bold, color: C.muted });
      cols.forEach((key, i) => fl.page.drawText(pdfSafe(colLabel[key].toUpperCase()), { x: fl.left + nameW + i * colW, y: top - 8, size: 6.5, font: f.bold, color: C.muted }));
    }
    fl.y = top - 12;
    fl.rule(C.accent);
    for (const r of rows) {
      const y0 = fl.y;
      const st = state(r.entry);
      const m = r.entry.measurement;
      const isPractice = r.entry === cmp.practice;
      if (!fl.dryRun) {
        if (isPractice) fl.page.drawRectangle({ x: fl.left - 5, y: y0 - 34, width: fl.usable + 10, height: 34, color: C.accentSoft });
        fl.page.drawText(fit(r.label, f.bold, 9), { x: fl.left, y: y0 - 11, size: 9, font: f.bold, color: isPractice ? C.accent : C.ink });
        const site = r.entry.website ?? (r.entry.domain ? `https://${r.entry.domain}` : null);
        if (site) {
          const label = fit(shownUrl(site), f.regular, 7);
          fl.page.drawText(label, { x: fl.left, y: y0 - 20, size: 7, font: f.regular, color: C.accent });
          fl.addLinkAnnotation(fl.page, fl.left, y0 - 22, f.regular.widthOfTextAtSize(label, 7), 9, site);
        }
        if (r.entry.relevance && !isPractice) fl.page.drawText(fit(r.entry.relevance, f.regular, 6.5), { x: fl.left, y: y0 - 28, size: 6.5, font: f.regular, color: C.muted });
        if (st === "ok") {
          const pm = cmp.practice.measurement?.status === "ok" ? cmp.practice.measurement : null;
          cols.forEach((key, i) => {
            const x = fl.left + nameW + i * colW;
            // On a competitor row, only the measures where they lead are filled in; a dash elsewhere,
            // explained under the table.
            if (!isPractice && ahead.size > 0 && !leads(key, m![key], pm?.[key] ?? null)) {
              fl.page.drawText("-", { x, y: y0 - 16, size: 10, font: f.bold, color: C.faint });
              return;
            }
            // Performance keeps Google's ring, the dial PageSpeed Insights itself shows.
            if (key === "performanceScore" && m![key] !== null) {
              fl.ring(x + 13, y0 - 16, 13, m![key], googleLevel(m![key]!), { stroke: 3.5, numberSize: 10 });
              return;
            }
            fl.page.drawText(fmt(key, m![key]), { x, y: y0 - 16, size: m![key] !== null ? 10 : 8, font: m![key] !== null ? f.bold : f.regular, color: m![key] !== null ? C.ink : C.faint });
          });
        } else {
          fl.page.drawText(st === "pending" ? "Analysis in progress" : "Could not be measured", { x: fl.left + nameW, y: y0 - 16, size: 8, font: f.regular, color: C.faint });
        }
        const pmT = cmp.practice.measurement?.status === "ok" ? cmp.practice.measurement : null;
        const cells = st === "ok" ? cols.map((key) => `${colLabel[key]} ${!isPractice && ahead.size > 0 && !leads(key, m![key], pmT?.[key] ?? null) ? "-" : fmt(key, m![key])}`).join(", ") : "";
        fl.transcript.push(`${r.label}${r.entry.website ? ` (${r.entry.website})` : ""}: ${st === "ok" ? cells : st === "pending" ? "Analysis in progress" : "Could not be measured"}`);
      }
      fl.y = y0 - 36;
      fl.rule();
    }
  });

  fl.gap(5);
  if (ahead.size > 0) {
    fl.text("A dash means that practice did not measure ahead of your homepage on that measure, so no number is shown for it.", { size: 7.5, color: C.muted });
    fl.gap(3);
  }
  if (advantages.length) {
    fl.text("Where nearby practices measured better", { font: f.bold, size: 10, color: C.dark });
    for (const g of advantages) fl.text(`• ${METRIC_LABEL[g.metric]}: ${g.sentence}`, { size: 9, color: C.ink, lineHeight: 12.5 });
    fl.gap(3);
  }
  if (strengths.length) {
    fl.text("Where your practice measured better", { font: f.bold, size: 10, color: C.dark });
    for (const g of strengths) fl.text(`• ${g.sentence}`, { size: 8.5, color: C.secondary, lineHeight: 12 });
    fl.gap(3);
  }
  if (!cmp.gaps.length) fl.text("No difference large enough to call out on the measurements available.", { size: 8.5, color: C.secondary });
  if (cmp.narrative) {
    fl.gap(2);
    fl.text(cmp.narrative.text, { size: 9, color: C.ink });
    fl.text("Written from the measurements above; every number is from the data.", { size: 7, color: C.muted });
  }
  fl.gap(4);
  fl.text(`How this comparison was made: ${cmp.method}`, { size: 7.5, color: C.muted });
  fl.text(cmp.attribution, { size: 7.5, color: C.muted });
}

// ───────── E. Next three actions ─────────
function actionsSection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, b: ReportBriefing) {
  if (!b.actions.length) return;
  fl.section(`Your next ${b.actions.length === 1 ? "action" : `${b.actions.length} actions`}`, "Start at the top. Each one comes straight from a verified finding in this report.");
  b.actions.forEach((a, i) => {
    fl.keepTogether(() => {
      const top = fl.y;
      if (!fl.dryRun) fl.page.drawText(String(i + 1).padStart(2, "0"), { x: fl.left, y: top - 14, size: 16, font: f.bold, color: C.accent });
      const x = fl.left + 30;
      fl.text(a.title, { font: f.bold, size: 11, color: C.dark, x, maxWidth: fl.usable - 30 });
      fl.text(a.detail, { size: 9, color: C.secondary, x, maxWidth: fl.usable - 30 });
      fl.text(`${a.severityLabel}${a.whenLabel ? ` · ${a.whenLabel.toLowerCase()}` : ""} · ${a.ownerLabel}`, { font: f.bold, size: 7.5, color: SEVERITY_COLOR[a.severity] ?? C.muted, x, maxWidth: fl.usable - 30 });
      fl.gap(6);
    });
  });
  fl.text("Severity is the audit's own rating of each finding. Fixing these addresses what we measured; it is not a promise of rankings, enquiries or revenue.", { size: 7.5, color: C.muted });
}

// ───────── F. Consultation CTA ─────────
function consultationCta(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, input: ReportPdfInput) {
  fl.gap(10);
  panel(
    fl,
    14,
    () => {
      const x = fl.left + 16;
      const w = fl.usable - 32;
      fl.text("Find Out What's Holding Your Practice Back", { font: f.bold, size: 15, color: C.dark, x, maxWidth: w, lineHeight: 18 });
      fl.gap(3);
      fl.text("We'll walk you through the findings, explain the opportunities and help you decide which improvements to prioritise.", { size: 9.5, color: C.secondary, x, maxWidth: w });
      fl.gap(5);
      fl.link("Book your website review", input.consultationUrl, { size: 11, x });
      fl.text(input.consultationUrl, { size: 7.5, color: C.muted, x, maxWidth: w });
      fl.gap(4);
      fl.link("Request Your Full Technical Report", input.technicalReportRequestUrl, { size: 9.5, x });
      fl.text("The full technical report - every measurement, affected URL and developer instruction - is provided by our team after a website review, not sent automatically.", { size: 7.5, color: C.muted, x, maxWidth: w });
    },
    { fill: C.accentSoft, border: C.accent },
  );
  fl.gap(6);
  fl.text("This report is based only on data collected during the audit; scores describe how the site measured on the audit date and are not predictions of rankings, traffic or revenue.", { size: 7.5, color: C.muted });
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

  const briefing = buildBriefing({
    business: { name: business.name, website: business.website, city: business.city },
    scores: payload.scores ? { overall: payload.scores.overall, performance: payload.scores.performance } : null,
    severityCounts: payload.severityCounts,
    findings: payload.findings.map(toBriefingFinding),
    pagesCrawled: ((payload.crawlStats as { pagesCrawled?: number } | null)?.pagesCrawled ?? 0) as number,
    checksRun: payload.checks.filter((c) => c.status === "PASS" || c.status === "FAIL").length,
  });

  // A — the briefing owns the first page.
  executiveBriefing(fl, f, briefing, input, date, payload.performance as unknown as PerfRow[]);

  // B — flows straight on from the briefing; each card is kept whole.
  fl.gap(10);
  problemsSection(fl, f, briefing);

  // C, D, E, F — flow on, each kept whole where it fits.
  fl.ensure(300);
  opportunitySection(fl, f, payload.opportunity, input);

  if (payload.competitors) {
    fl.ensure(330);
    competitorsSection(fl, f, payload.competitors);
  }

  fl.ensure(240);
  actionsSection(fl, f, briefing);

  fl.ensure(200);
  consultationCta(fl, f, input);

  fl.finish();
  const bytes = await doc.save();
  return { bytes, pageCount: fl.pages.length, transcript: fl.transcript.join("\n") };
}
