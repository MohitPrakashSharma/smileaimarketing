import { PDFDocument } from "pdf-lib";
import type { V2ReportPayload } from "../report";
import { buildPerformanceView, metricsFor, metricGroups, googleChecksFor, testDateLabel, type PerfRow, type Device } from "../view/performanceView";
import { measuredSummary, primaryAction, whyInBrief, type FindingLike } from "../view/findingView";
import { PILLAR_DEFS, PILLAR_LABEL, BUCKET_LABEL, OWNER_LABEL, IMPACT_LABEL } from "../view/pillars";
import { Flow, C, LEVEL_COLOR, LEVEL_LABEL, SEVERITY_COLOR, AUDIT_LEVEL_LABEL, googleLevel, auditLevel, loadFonts, dateLabel, shortPath, pdfSafe, type Level, type PdfOutput } from "./layout";

/**
 * Technical report PDF: every section of the v2 web report with the complete
 * stored evidence — per-check measurements, targets, full affected URLs,
 * device and source, Lighthouse diagnostics, developer instructions and
 * check identifiers. Nothing is re-measured or estimated; whatever the
 * website hides behind an accordion is printed here in full.
 *
 * `TECHNICAL_PDF_LAYOUT` is part of the stored file name — bump it whenever
 * the layout changes so cached files are regenerated.
 */

export const TECHNICAL_PDF_LAYOUT = "tech-r1";

export interface ReportPdfInput {
  business: { name: string; website: string; city: string; industryLabel: string; customersWord: string };
  /** Audit completion time (report date). */
  completedAt: Date;
  headline: { line1: string; line2: string };
  summary: string | null;
  /** Public report URL — never a development address. */
  reportUrl: string;
  payload: V2ReportPayload;
}

type Finding = V2ReportPayload["findings"][number];
type Detail = { checkId: string; title: string; severity: string; dataSource?: string; device?: string | null; affectedPageCount: number; detected: string | null; expected: string; fix: string; developerFix: string | null; urls: Array<{ url: string; detected?: string; expected?: string }> };
const detailsOf = (f: Finding): Detail[] => (Array.isArray(f.developerDetails) ? (f.developerDetails as Detail[]) : []);
const toLike = (f: Finding): FindingLike => ({ title: f.title, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, developerDetails: detailsOf(f), recommendedFix: f.recommendedFix, whyItMatters: f.whyItMatters, device: f.device });
const SOURCE_LABEL: Record<string, string> = { field: "Real users (Chrome UX Report)", lab: "Lab test (Lighthouse)", diagnostic: "Lighthouse audit", crawler: "Our crawler", ai: "AI review (suggestion)" };

export async function renderTechnicalPdf(input: ReportPdfInput): Promise<PdfOutput> {
  const { payload, business } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`SEO Audit — Technical report — ${business.name}`);
  doc.setAuthor("Smile AI Marketing");
  doc.setCreationDate(input.completedAt);
  const f = await loadFonts(doc);
  const date = dateLabel(input.completedAt);
  const fl = new Flow(doc, f, { business: business.name, date, url: input.reportUrl, kind: "TECHNICAL REPORT" });
  const scores = payload.scores;
  const findings = payload.findings;
  const pagesCrawled = ((payload.crawlStats as { pagesCrawled?: number } | null)?.pagesCrawled ?? 0) as number;
  const budgetHit = (payload.crawlStats as { budgetHit?: string } | null)?.budgetHit;
  const checksRun = payload.checks.filter((c) => c.status === "PASS" || c.status === "FAIL").length;
  const sc = payload.severityCounts;

  // ───────────────────────── 1. Audit overview ─────────────────────────
  fl.gap(6);
  fl.text("SEO AUDIT — TECHNICAL REPORT", { font: f.bold, size: 8, color: C.accent });
  fl.gap(4);
  fl.text(`${input.headline.line1} ${input.headline.line2}`, { font: f.bold, size: 22, color: C.dark, lineHeight: 26 });
  fl.gap(6);
  fl.text(`${business.industryLabel}: ${business.name}${business.city ? ` · ${business.city}` : ""} · ${business.website}`, { size: 9.5, color: C.secondary });
  fl.text(`Audited ${date}`, { size: 9.5, color: C.secondary });
  fl.gap(14);

  // score ring + summary
  {
    const overall = scores?.overall ?? null;
    const level = overall === null ? null : auditLevel(overall);
    const ringR = 34;
    const blockTop = fl.y;
    fl.ring(fl.left + ringR + 6, blockTop - ringR - 4, ringR, overall, level, { stroke: 7, numberSize: 26, caption: "SEO health" });
    const textX = fl.left + ringR * 2 + 26;
    fl.text(`Overall SEO health: ${overall === null ? "not measured" : `${overall}/100 — ${AUDIT_LEVEL_LABEL[level!]}`}`, { x: textX, font: f.bold, size: 11 });
    fl.text("Our audit score — deductions for every verified issue across the crawled pages. Not a Google score.", { x: textX, size: 8.5, color: C.muted });
    fl.gap(4);
    fl.text(input.summary ?? "", { x: textX, size: 9.5, lineHeight: 13 });
    const used = blockTop - fl.y;
    if (used < ringR * 2 + 26) fl.y = blockTop - (ringR * 2 + 26);
  }
  fl.gap(10);

  // stats strip
  {
    const stats: Array<[string, string, string]> = [
      [String(pagesCrawled), "Pages crawled", budgetHit && budgetHit !== "none" ? "crawl budget reached" : "full crawl"],
      [String((sc.CRITICAL ?? 0) + (sc.HIGH ?? 0)), "Critical & high", `${sc.MEDIUM ?? 0} medium · ${sc.LOW ?? 0} low`],
      [String(findings.length), "Verified findings", `from ${checksRun} checks`],
    ];
    const w = fl.usable / 3;
    fl.ensure(46);
    const top = fl.y;
    stats.forEach(([v, l, c], i) => {
      const x = fl.left + i * w;
      if (!fl.dryRun) {
        fl.page.drawRectangle({ x: x + (i ? 4 : 0), y: top - 44, width: w - (i ? 4 : 0) - (i < 2 ? 4 : 0), height: 44, color: C.surface, borderColor: C.border, borderWidth: 0.5 });
        fl.page.drawText(v, { x: x + 10 + (i ? 4 : 0), y: top - 22, size: 16, font: f.bold, color: C.ink });
        fl.page.drawText(pdfSafe(l.toUpperCase()), { x: x + 10 + (i ? 4 : 0), y: top - 32, size: 6.5, font: f.bold, color: C.muted });
        fl.page.drawText(pdfSafe(c), { x: x + 10 + (i ? 4 : 0), y: top - 40, size: 6.5, font: f.regular, color: C.muted });
      }
      fl.transcript.push(`${l}: ${v} (${c})`);
    });
    fl.y = top - 52;
  }

  // ───────────────────────── 2. Google website checks ─────────────────────────
  const rows = payload.performance as PerfRow[];
  const view = buildPerformanceView(rows);
  const perfStage = payload.progress?.stages.find((s) => s.key === "performance");
  fl.section("Google website checks", "Google's own five checks (PageSpeed Insights / Lighthouse), one page and one device at a time. They complement the SEO audit above; only Performance feeds into it. Google's SEO check is a 10-point technical basics list — not our SEO audit.");
  if (!view.okRuns) {
    fl.text(rows.length ? "Google PageSpeed Insights could not test this site during the audit, so these five checks are not available and do not affect the score." : perfStage?.status === "skipped" ? `Google's checks were not run for this audit${perfStage.detail ? ` (${perfStage.detail})` : ""}.` : "Google's checks were not run for this audit.", { size: 9.5 });
    for (const r of view.failedRuns.slice(0, 6)) fl.text(`${r.strategy} · ${r.url}${r.error ? ` — ${r.error}` : ""}`, { font: f.mono, size: 7.5, color: C.muted });
  } else {
    if (scores?.performance != null) fl.text(`Why our Performance pillar (${scores.performance}/100) differs from Google's score: the pillar deducts points for every verified performance issue across all ${view.pages.length} tested page${view.pages.length === 1 ? "" : "s"} on both devices; Google's number is Lighthouse's composite for a single page on a single device.`, { size: 8.5, color: C.secondary });
    fl.gap(6);
    for (const pg of view.pages) {
      for (const device of ["mobile", "desktop"] as Device[]) {
        const row = pg[device];
        if (!row) continue;
        const checks = googleChecksFor(row);
        const when = testDateLabel(row.analysisUtc);
        // --- summary block: title + five rings ---
        fl.keepTogether(() => {
          fl.text(`${pg.path} · ${device === "mobile" ? "Mobile" : "Desktop"}${when ? ` · tested ${when}` : ""}${row.lighthouseVersion ? ` · Lighthouse ${row.lighthouseVersion}` : ""}`, { font: f.bold, size: 11 });
          fl.text(`Google Lighthouse results for ${row.url}. Each number is one Google run; nothing is averaged across pages or devices.`, { size: 8, color: C.muted });
          fl.gap(8);
          const slot = fl.usable / 5;
          const r = 19;
          fl.ensure(r * 2 + 34);
          const top = fl.y;
          checks.forEach((c, i) => {
            const cx = fl.left + slot * i + slot / 2;
            const cy = top - r - 4;
            if (c.kind === "score") fl.ring(cx, cy, r, c.available ? c.score : null, c.available && c.score !== null ? googleLevel(c.score) : null, { stroke: 4, numberSize: 13 });
            else if (!fl.dryRun) {
              const lvl: Level | null = c.available ? (c.passed === c.applicable ? "healthy" : "opportunity") : null;
              fl.page.drawCircle({ x: cx, y: cy, size: r, borderColor: lvl ? LEVEL_COLOR[lvl] : C.track, borderWidth: 4 });
              const lbl = c.available ? `${c.passed}/${c.applicable}` : "-";
              const w = f.bold.widthOfTextAtSize(lbl, 11);
              fl.page.drawText(lbl, { x: cx - w / 2, y: cy - 2, size: 11, font: f.bold, color: c.available ? C.ink : C.faint });
              const sub = "PASSED";
              const sw = f.bold.widthOfTextAtSize(sub, 5);
              fl.page.drawText(sub, { x: cx - sw / 2, y: cy - 10, size: 5, font: f.bold, color: C.muted });
            }
            if (!fl.dryRun) {
              const name = pdfSafe(c.label);
              const nw = f.bold.widthOfTextAtSize(name, 8);
              fl.page.drawText(name, { x: cx - nw / 2, y: cy - r - 14, size: 8, font: f.bold, color: C.ink });
              const status = c.kind === "score" ? (c.available ? LEVEL_LABEL[googleLevel(c.score!)] : "Not collected") : c.available ? (c.passed === c.applicable ? "All passed" : "Some failed") : "Not collected";
              const stw = f.regular.widthOfTextAtSize(status, 7);
              fl.page.drawText(status, { x: cx - stw / 2, y: cy - r - 23, size: 7, font: f.regular, color: C.muted });
              if (c.key === "seo") {
                const n = "Google basics only";
                fl.page.drawText(n, { x: cx - f.italic.widthOfTextAtSize(n, 6.5) / 2, y: cy - r - 31, size: 6.5, font: f.italic, color: C.muted });
              }
              fl.transcript.push(`${c.label}: ${c.kind === "score" ? (c.available ? `${c.score}/100 (${status})` : "not collected") : c.available ? `${c.passed} of ${c.applicable} checks passed` : "not collected"}`);
            }
          });
          fl.y = top - (r * 2 + 40);
        });

        // --- performance detail ---
        const perf = checks[0];
        fl.keepTogether(() => {
          fl.text("Performance — what Google measured", { font: f.bold, size: 9.5, color: C.dark });
          if (!perf.available) {
            fl.text(perf.unavailableReason ?? "Not measured for this run.", { size: 8.5, color: C.muted });
            return;
          }
          fl.text(row.field?.available ? "Real users = Chrome UX Report (75th percentile). Lab = Lighthouse simulation." : "Lab measurements only — Google has no real-visitor (Chrome UX Report) data for this site yet.", { size: 8, color: C.muted });
          fl.gap(3);
          for (const g of metricGroups(metricsFor(row))) {
            fl.text(`${g.title} · ${g.hint}`, { font: f.bold, size: 8, color: C.muted });
            for (const m of g.metrics) {
              const lvl = m.rating === "good" ? "healthy" : m.rating === "needs_improvement" ? "opportunity" : m.rating === "poor" ? "attention" : null;
              const src = m.source === "field" ? `real users${m.labDisplay ? `; lab ${m.labDisplay}` : ""}` : m.source === "lab" ? `lab; target ${m.goodLabel}` : m.unavailableReason ?? "no data";
              const line = `${m.fullName} (${m.label}): ${m.display} — ${lvl ? LEVEL_LABEL[lvl] : "No data"} · ${src}`;
              fl.text(line, { size: 8.5, x: fl.left + 8 });
              fl.text(m.explain, { size: 7.5, color: C.muted, x: fl.left + 8 });
            }
            fl.gap(3);
          }
          if (row.lcpElement?.snippet && row.lcpElement.snippet.length >= 24) {
            fl.text("Largest element on load (for your developer):", { font: f.bold, size: 8, color: C.muted });
            fl.text(row.lcpElement.snippet.slice(0, 300), { font: f.mono, size: 7, color: C.secondary, x: fl.left + 8 });
          }
        });
        fl.gap(6);

        // --- accessibility / best practices / google seo ---
        for (const c of checks.slice(1, 4)) {
          fl.keepTogether(() => {
            fl.text(c.label + (c.key === "seo" ? " (Google Lighthouse basics — not our SEO audit)" : ""), { font: f.bold, size: 9.5, color: C.dark });
            if (!c.available) {
              fl.text(c.unavailableReason ?? "Not collected.", { size: 8.5, color: C.muted });
              return;
            }
            fl.text(`${c.score}/100 — ${LEVEL_LABEL[googleLevel(c.score!)]} · ${c.passed} of ${c.applicable} weighted checks passed. ${c.scope}.`, { size: 8.5 });
            if (c.failed.length === 0) fl.text("Every weighted check passed on this page.", { size: 8.5, color: C.healthy });
            else {
              fl.text("Checks that cost points:", { font: f.bold, size: 8, color: C.muted });
              for (const a of c.failed) fl.text(`• ${a.title} — ${a.displayValue ?? (a.score === 0 ? "failed" : `${Math.round((a.score ?? 0) * 100)}%`)} (${a.id})`, { size: 8.5, x: fl.left + 8 });
            }
          });
          fl.gap(5);
        }

        // --- agentic browsing ---
        const ag = checks[4];
        fl.keepTogether(() => {
          fl.text("Agentic Browsing (Google, experimental)", { font: f.bold, size: 9.5, color: C.dark });
          if (!ag.available) {
            fl.text(ag.unavailableReason ?? "Not collected.", { size: 8.5, color: C.muted });
            return;
          }
          fl.text(`${ag.passed} of ${ag.applicable} applicable checks passed. Google tests whether AI agents can read and operate this page; it reports pass/fail checks rather than a score and labels the category as under development — a preview, not a ranking factor.`, { size: 8.5 });
          for (const c of ag.checks) {
            const applicable = c.score !== null && c.mode !== "notApplicable" && c.mode !== "manual" && c.mode !== "informative";
            const passed = applicable && (c.mode === "numeric" ? (c.score ?? 0) >= 0.9 : (c.score ?? 0) >= 1);
            fl.text(`• ${c.title} — ${applicable ? (passed ? "Passed" : "Failed") : "Not applicable"}${c.displayValue ? ` · ${c.displayValue}` : ""} (${c.id})`, { size: 8.5, x: fl.left + 8 });
          }
        });
        fl.gap(10);
        fl.rule();
        fl.gap(8);
      }
    }
    if (view.failedRuns.length) fl.text(`${view.failedRuns.length} of ${view.totalRuns} Google runs could not complete and are not shown: ${view.failedRuns.map((r) => `${r.strategy} ${r.url}${r.error ? ` (${r.error})` : ""}`).join("; ")}.`, { size: 8, color: C.muted });
  }

  // ───────────────────────── 3. Findings by area ─────────────────────────
  fl.section("Findings by area", "Our SEO audit, pillar by pillar. Each score starts at 100 and loses points for every verified issue; “not measured” never counts against you.");
  for (const p of PILLAR_DEFS) {
    const score = scores ? scores[p.key] : null;
    const mine = findings.filter((x) => x.pillar === p.pillar);
    const level = score === null ? null : auditLevel(score);
    fl.keepTogether(() => {
      const top = fl.y;
      fl.text(p.label, { font: f.bold, size: 10.5, maxWidth: fl.usable - 150 });
      const desc = score === null ? p.notMeasured(business.city) : mine.length ? `${mine.length} finding${mine.length === 1 ? "" : "s"} — ${mine.slice(0, 3).map((x) => x.title).join("; ")}${mine.length > 3 ? "; …" : "."}` : "No problems found in the checks we ran.";
      fl.text(desc, { size: 8.5, color: C.muted, maxWidth: fl.usable - 150 });
      if (!fl.dryRun) {
        const label = score === null ? "Not measured" : `${score}/100`;
        fl.page.drawText(label, { x: fl.right - 140, y: top - 12, size: 12, font: f.bold, color: score === null ? C.faint : C.ink });
        if (level) fl.pill(AUDIT_LEVEL_LABEL[level], level, fl.right - 72, top - 1);
        fl.transcript.push(`${p.label}: ${label}${level ? ` (${AUDIT_LEVEL_LABEL[level]})` : ""}`);
      }
      fl.gap(3);
      fl.rule();
      fl.gap(3);
    });
  }

  // ───────────────────────── 4. Action plan ─────────────────────────
  const plan = findings.slice(0, 5);
  fl.section("Action plan", `The ${plan.length} fixes that matter most, ranked by severity, reach and effort. Every item is a verified finding — evidence and full recommendations follow in the detailed findings.`);
  if (!plan.length) fl.text("Nothing crossed our thresholds — the site is in good shape on the checks we ran.", { size: 9.5 });
  plan.forEach((fd, i) => {
    const like = toLike(fd);
    fl.keepTogether(() => {
      fl.text(`${i + 1}. ${fd.title}`, { font: f.bold, size: 10.5 });
      fl.text(`${fd.severity} · ${PILLAR_LABEL[fd.pillar] ?? fd.pillar} · ${fd.affectedPageCount} page${fd.affectedPageCount === 1 ? "" : "s"} · effort ${fd.effort}/5 · ${OWNER_LABEL[fd.owner] ?? fd.owner} · ${BUCKET_LABEL[fd.bucket]?.toLowerCase() ?? fd.bucket}`, { size: 7.5, color: C.muted });
      fl.kv("Measured", measuredSummary(like, pagesCrawled || null));
      fl.kv("Why", whyInBrief(like));
      fl.kv("Do this", primaryAction(like));
      fl.gap(6);
    });
  });

  // ───────────────────────── 5. Detailed findings ─────────────────────────
  fl.section(`Detailed findings (${findings.length})`, `${sc.CRITICAL ?? 0} critical · ${sc.HIGH ?? 0} high · ${sc.MEDIUM ?? 0} medium · ${sc.LOW ?? 0} low${sc.OPPORTUNITY ? ` · ${sc.OPPORTUNITY} suggestions` : ""}. Everything the online report shows in its expandable details is printed here in full.`);
  for (const bucket of ["this_week", "this_month", "this_quarter"] as const) {
    const items = findings.filter((x) => x.bucket === bucket);
    if (!items.length) continue;
    fl.ensure(160); // never leave a bucket label alone at the foot of a page
    fl.text(BUCKET_LABEL[bucket].toUpperCase(), { font: f.bold, size: 8.5, color: C.accent });
    fl.gap(4);
    for (const fd of items) {
      const like = toLike(fd);
      const details = detailsOf(fd);
      fl.keepTogether(() => {
        const top = fl.y;
        const startPage = fl.page;
        const w = fl.pill(fd.severity, fd.severity === "CRITICAL" || fd.severity === "HIGH" ? "attention" : fd.severity === "MEDIUM" ? "opportunity" : null, fl.left, top);
        const src = fd.source === "pagespeed" ? `PageSpeed${fd.device ? ` · ${fd.device}` : ""}` : fd.source === "openai" ? "AI suggestion" : null;
        if (!fl.dryRun) fl.page.drawText(pdfSafe(`${src ? `${src} · ` : ""}${PILLAR_LABEL[fd.pillar] ?? fd.pillar} · ${fd.affectedPageCount} page${fd.affectedPageCount === 1 ? "" : "s"} · ${OWNER_LABEL[fd.owner] ?? fd.owner}`), { x: fl.left + w + 6, y: top - 8.4, size: 7.5, font: f.regular, color: C.muted });
        fl.y = top - 14;
        fl.text(fd.title, { font: f.bold, size: 11 });
        fl.transcript.push(`${fd.severity} ${src ? `${src} ` : ""}${PILLAR_LABEL[fd.pillar] ?? fd.pillar}`);
        fl.kv("Measured", measuredSummary(like, pagesCrawled || null));
        fl.gap(3);
        fl.text(`Expected impact ${IMPACT_LABEL[fd.impact] ?? fd.impact} (${fd.impact}/5) · effort ${fd.effort}/5 · confidence ${fd.confidence}% · ${BUCKET_LABEL[fd.bucket] ?? fd.bucket}`, { size: 8, color: C.muted });
        fl.gap(3);
        fl.text(`Why it matters — ${fd.whyItMatters}`, { size: 9 });
        if (details.length) {
          fl.gap(3);
          fl.text("What we measured", { font: f.bold, size: 9 });
          for (const d of details) {
            fl.text(`${SOURCE_LABEL[d.dataSource ?? (fd.source === "pagespeed" ? "diagnostic" : "crawler")] ?? "Our crawler"}${d.device ? ` · ${d.device}` : ""} · ${d.title} · ${d.affectedPageCount} page${d.affectedPageCount === 1 ? "" : "s"} (${d.checkId})`, { size: 8, color: C.secondary, x: fl.left + 8 });
            if (d.detected) fl.kv("Measured", d.detected, { x: fl.left + 8, size: 8.5 });
            fl.kv("Target", d.expected, { x: fl.left + 8, size: 8.5 });
            for (const u of d.urls.slice(0, 8)) fl.text(`${shortPath(u.url)}${u.detected ? ` — ${u.detected}` : ""}`, { font: f.mono, size: 7, color: C.muted, x: fl.left + 16 });
            if (d.urls.length > 8) fl.text(`+${d.urls.length - 8} more pages`, { size: 7, color: C.muted, x: fl.left + 16 });
            fl.gap(2);
          }
        }
        fl.gap(2);
        fl.text("Recommended fix", { font: f.bold, size: 9 });
        for (const line of fd.recommendedFix.split("\n").filter(Boolean)) fl.text(line, { size: 9, x: fl.left + 8 });
        const dev = details.filter((d) => d.developerFix);
        if (dev.length) {
          fl.gap(2);
          fl.text("For your developer", { font: f.bold, size: 9 });
          for (const d of dev) {
            fl.text(`${d.title} (${d.checkId})`, { size: 8, color: C.secondary, x: fl.left + 8 });
            fl.text(d.developerFix!, { font: f.mono, size: 7.5, color: C.ink, x: fl.left + 8 });
          }
        }
        // severity bar down the left edge (only when the finding stayed on one page)
        if (!fl.dryRun && fl.page === startPage) fl.page.drawRectangle({ x: fl.left - 8, y: fl.y - 2, width: 2.5, height: top - fl.y + 2, color: SEVERITY_COLOR[fd.severity] ?? C.muted });
        fl.gap(6);
        fl.rule();
        fl.gap(8);
      });
    }
  }

  fl.gap(6);
  fl.text(`See the interactive report online: ${input.reportUrl}`, { font: f.bold, size: 9, color: C.accent });
  fl.text("This report is based only on data collected during the audit (our crawler and Google PageSpeed Insights). Scores are not predictions of rankings, traffic or revenue.", { size: 8, color: C.muted });

  fl.finish();
  const bytes = await doc.save();
  return { bytes, pageCount: fl.pages.length, transcript: fl.transcript.join("\n") };
}
