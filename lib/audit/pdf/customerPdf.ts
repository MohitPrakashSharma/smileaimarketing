import { PDFDocument, type RGB } from "pdf-lib";
import type { V2ReportPayload } from "../report";
import { buildBriefing, type BriefingFinding, type BriefingProblem, type ReportBriefing } from "../view/briefing";
import type { FindingLike } from "../view/findingView";
import { Flow, C, SEVERITY_COLOR, googleLevel, loadFonts, dateLabel, pdfSafe, type PdfOutput } from "./layout";
import { buildPerformanceView, googleChecksFor, testDateLabel, type PerfRow } from "../view/performanceView";
import type { ReportPdfInput } from "./technicalPdf";
import type { LocalComparison, ComparisonEntry, ComparisonMetricKey } from "../competitors/types";
import { METRIC_LABEL } from "../competitors/view";
import { INPUT_LABEL, type OpportunityInputKey, type OpportunityScenario, type SourcedValue } from "../opportunity/types";
import { CONTACT } from "@/lib/siteConfig";

/**
 * Customer report PDF — an editorial briefing, one story per page:
 *
 *   1      Cover: the headline, the numbers, what's inside, Google's own scores
 *   2..4   One page per verified problem: measured chip, what's happening,
 *          how to fix it, and what the fix is measured against
 *   5      Local competitors — the same verified comparison the web shows
 *   6      What it could be worth — the automated opportunity scenario
 *   7      What to do next + how to reach us (phone, email, booking link)
 *
 * The story text comes from `buildBriefing`, the same function the web report
 * calls, so headline, summary, problems, counts and actions always match. No
 * raw HTML, check identifiers, per-page API errors or URL inventories appear
 * here — that evidence lives in the technical report, which our team still
 * provides by hand after a website review.
 *
 * `CUSTOMER_PDF_LAYOUT` is part of the stored file name — bump it whenever the
 * layout changes so cached files are regenerated.
 */

export const CUSTOMER_PDF_LAYOUT = "cust-r8"; // r8: reference type scale, serif deck, PageSpeed screenshots on the cover; r7: editorial story-per-page layout with direct contact; r6: business briefing; r5: competitor call-out; r4: automated financial scenario

type Finding = V2ReportPayload["findings"][number];

const cad = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
const num = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 1 });
const GUTTER = 26;
/** The editorial layout runs a tighter margin than the technical report. */
const MARGIN = 38;
/** Vertical rhythm: every gap on the page is one of these, so the document breathes evenly. */
const SPACE = { xs: 5, sm: 10, md: 18, lg: 28, xl: 40 } as const;
/** Display sizes, following the reference layout: a cover that fills the page and story heads twice the body scale. */
const COVER_DISPLAY = 34;
const STORY_DISPLAY = 42;

const toBriefingFinding = (f: Finding): BriefingFinding => ({
  id: f.id,
  findingKey: f.findingKey,
  expectedValue: f.expectedValue,
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

/** Small-caps kicker with a rule under it — the line that opens every page. */
function kicker(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, left: string, right = "", leftColor = C.accent) {
  const top = fl.y;
  if (!fl.dryRun) {
    fl.page.drawText(pdfSafe(left.toUpperCase()), { x: fl.left, y: top - 8, size: 7.5, font: f.bold, color: leftColor });
    if (right) {
      const r = pdfSafe(right.toUpperCase());
      fl.page.drawText(r, { x: fl.right - f.bold.widthOfTextAtSize(r, 7.5), y: top - 8, size: 7.5, font: f.bold, color: C.ink });
    }
    fl.transcript.push(`${left}${right ? ` — ${right}` : ""}`);
  }
  fl.y = top - 14;
  if (!fl.dryRun) fl.page.drawLine({ start: { x: fl.left, y: fl.y }, end: { x: fl.right, y: fl.y }, thickness: 1.2, color: C.dark });
  fl.y -= 16;
}

/** Two columns with their own headings; the cursor lands under the taller one. */
function columns(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, leftTitle: string, leftBody: () => void, rightTitle: string, rightBody: () => void) {
  const colW = (fl.usable - GUTTER) / 2;
  const startY = fl.y;
  const head = (title: string, x: number) => {
    if (!fl.dryRun) {
      fl.page.drawText(pdfSafe(title.toUpperCase()), { x, y: fl.y - 7.5, size: 7, font: f.bold, color: C.ink });
      fl.page.drawLine({ start: { x, y: fl.y - 13 }, end: { x: x + colW, y: fl.y - 13 }, thickness: 0.8, color: C.dark });
      fl.transcript.push(title);
    }
    fl.y -= 26;
  };
  head(leftTitle, fl.left);
  leftBody();
  const leftEnd = fl.y;
  fl.y = startY;
  head(rightTitle, fl.left + colW + GUTTER);
  rightBody();
  fl.y = Math.min(leftEnd, fl.y);
  return colW;
}

/** The measured value in a filled cell, with the sentence it supports beside it. */
function metricChip(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, value: string | null, fill: RGB, headline: string, detail: string) {
  const chipW = value ? 124 : 0;
  const pad = 12;
  const textX = fl.left + chipW + pad;
  const textW = fl.usable - chipW - pad * 2;
  const inner = () => {
    fl.text(headline, { font: f.bold, size: 11, color: C.dark, x: textX, maxWidth: textW, lineHeight: 14 });
    fl.gap(2);
    fl.text(detail, { font: f.serifItalic, size: 9.5, color: C.secondary, x: textX, maxWidth: textW, lineHeight: 12.5 });
  };
  fl.keepTogether(() => {
    const h = Math.max(fl.measure(inner) + pad * 2, 52);
    const top = fl.y;
    if (!fl.dryRun) {
      fl.page.drawRectangle({ x: fl.left, y: top - h, width: fl.usable, height: h, borderColor: C.dark, borderWidth: 1 });
      if (value) {
        fl.page.drawRectangle({ x: fl.left, y: top - h, width: chipW, height: h, color: fill });
        const size = value.length > 8 ? 19 : value.length > 5 ? 24 : 30;
        const w = f.bold.widthOfTextAtSize(pdfSafe(value), size);
        fl.page.drawText(pdfSafe(value), { x: fl.left + chipW / 2 - w / 2, y: top - h / 2 - size * 0.34, size, font: f.bold, color: C.white });
        fl.transcript.push(`${value} — ${headline}`);
      }
    }
    fl.y = top - pad;
    inner();
    fl.y = top - h;
  });
}

/** The strip along the bottom of a story page: what the fix is measured against. */
function bottomStrip(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, title: string, body: string, o: { size?: number; maxLines?: number; bold?: boolean } = {}) {
  if (fl.dryRun) return;
  const size = o.size ?? 9.5;
  const maxLines = o.maxLines ?? 2;
  const font = o.bold === false ? f.regular : f.bold;
  const lh = size * 1.28;
  const h = 22 + maxLines * lh;
  const y = fl.bottom - 4;
  fl.page.drawRectangle({ x: 0, y, width: fl.width, height: h, color: C.accentSoft });
  fl.page.drawRectangle({ x: 0, y: y + h - 2.5, width: fl.width, height: 2.5, color: C.accent });
  fl.page.drawText(pdfSafe(title.toUpperCase()), { x: fl.left, y: y + h - 15, size: 7, font: f.bold, color: C.accentInk });
  fl.wrap(body, font, size, fl.usable)
    .slice(0, maxLines)
    .forEach((line, i) => fl.page.drawText(line, { x: fl.left, y: y + h - 26 - i * lh, size, font, color: C.dark }));
  fl.transcript.push(`${title}: ${body}`);
}

/**
 * "Desktop view / mobile view": Lighthouse's own screenshots of the homepage,
 * taken from the PageSpeed response the audit already fetched. Nothing is
 * re-fetched here and nothing is drawn when the run returned no screenshot, so
 * an audit stored before screenshots were captured simply omits this strip.
 */
async function screenshotStrip(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, rows: PerfRow[], o: { maxH?: number; caption?: string } = {}) {
  const view = buildPerformanceView(rows);
  const page = view.pages.find((p) => p.pageType === "home") ?? view.pages[0];
  const desktop = page?.desktop?.screenshot?.dataUri ?? null;
  const mobile = page?.mobile?.screenshot?.dataUri ?? null;
  if (!desktop && !mobile) return false;

  fl.ensure((o.maxH ?? 124) + 34);
  fl.text(`${o.caption ?? "What a visitor sees first"} · captured by Google PageSpeed Insights`.toUpperCase(), { font: f.bold, size: 7, color: C.muted });
  fl.gap(16);
  const top = fl.y;
  const maxH = o.maxH ?? 124;
  let drawn = 0;
  if (desktop) {
    const w = mobile ? fl.usable * 0.66 - 8 : fl.usable * 0.72;
    drawn = Math.max(drawn, await fl.image(desktop, fl.left, top, w, maxH, { caption: "Desktop view" }));
    if (mobile) {
      const mw = fl.usable * 0.34 - 8;
      drawn = Math.max(drawn, await fl.image(mobile, fl.left + w + 16, top, mw, maxH, { caption: "Mobile view" }));
    }
  } else if (mobile) {
    drawn = await fl.image(mobile, fl.left, top, fl.usable * 0.34, maxH, { caption: "Mobile view" });
  }
  fl.y = top - drawn - 6;
  return drawn > 0;
}

/** Google's PageSpeed rings for the audited homepage — only from a stored "ok" run. */
function googleRings(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, rows: PerfRow[], o: { radius?: number } = {}) {
  const view = buildPerformanceView(rows);
  const page = view.pages.find((p) => p.pageType === "home") ?? view.pages[0];
  const row = page?.mobile ?? page?.desktop ?? null;
  if (!row || row.status !== "ok") return false;
  const scores = googleChecksFor(row).filter((c) => c.kind === "score" && c.available && c.score !== null);
  if (!scores.length) return false;
  const device = page?.mobile ? "mobile" : "desktop";
  const date = testDateLabel(row.analysisUtc);
  fl.ensure(96);
  fl.text(`GOOGLE PAGESPEED INSIGHTS · HOMEPAGE · ${device.toUpperCase()}${date ? ` · TESTED ${date.toUpperCase()}` : ""}`, { font: f.bold, size: 7, color: C.secondaryAccent });
  fl.gap(6);
  const r = o.radius ?? 22;
  const step = fl.usable / scores.length;
  const top = fl.y;
  scores.forEach((c, i) => {
    fl.ring(fl.left + step * i + r + 8, top - r - 2, r, c.score, googleLevel(c.score!), { stroke: r * 0.24, numberSize: r * 0.78, caption: c.label });
    fl.transcript.push(`${c.label}: ${c.score}/100 (Google, ${device})`);
  });
  fl.y = top - (r * 2 + 26);
  return true;
}

// ───────── 1. Cover ─────────
async function cover(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, b: ReportBriefing, input: ReportPdfInput, date: string, perf: PerfRow[], inside: string[]) {
  fl.label(`Website report · ${date}`, "Executive briefing");
  kicker(fl, f, "Exclusive briefing", `For ${b.practice.name}${b.practice.city ? ` — ${b.practice.city}` : ""}`);

  const line1 = b.stats.findings === 0 ? "No Blocking Problems." : `${b.stats.findings} Verified Problems.`;
  const line2 = b.stats.score === null ? "Your Site Was Not Scored." : `Your Site Scores ${b.stats.score}/100.`;
  const line3 = b.stats.findings === 0 ? "Here's What We Checked." : "Here's What To Fix First.";
  // Each sentence is its own display call, so the cover breaks where the writing does.
  fl.gap(SPACE.md);
  fl.display(line1, "", { size: COVER_DISPLAY, lineHeight: COVER_DISPLAY * 1.06 });
  fl.display(line2, "", { size: COVER_DISPLAY, lineHeight: COVER_DISPLAY * 1.06 });
  fl.display(line3, line3, { size: COVER_DISPLAY, lineHeight: COVER_DISPLAY * 1.06 });
  fl.gap(SPACE.md);
  fl.text(b.summary, { font: f.serifItalic, size: 12.5, color: C.ink, lineHeight: 18 });
  fl.gap(SPACE.md);
  if (!fl.dryRun) fl.page.drawLine({ start: { x: fl.left, y: fl.y }, end: { x: fl.right, y: fl.y }, thickness: 1.2, color: C.dark });
  fl.y -= SPACE.md;

  // BY THE NUMBERS / INSIDE THIS REPORT
  const stats: Array<[string, string]> = [
    [b.stats.score === null ? "—" : `${b.stats.score}/100`, "website health score"],
    [String(b.stats.findings), "verified problems"],
    [String(b.stats.criticalHigh), `critical & high (${b.stats.critical} critical)`],
    [String(b.stats.pagesCrawled), "pages crawled"],
  ];
  columns(
    fl,
    f,
    "By the numbers",
    () => {
      for (const [v, label] of stats) {
        const y0 = fl.y;
        if (!fl.dryRun) {
          fl.page.drawText(pdfSafe(v), { x: fl.left, y: y0 - 16, size: 18, font: f.bold, color: C.accent });
          fl.page.drawText(pdfSafe(label), { x: fl.left + f.bold.widthOfTextAtSize(pdfSafe(v), 18) + 9, y: y0 - 14, size: 10, font: f.serifItalic, color: C.ink });
          fl.transcript.push(`${v} ${label}`);
        }
        fl.y = y0 - 26;
      }
    },
    "Inside this report",
    () => {
      const colW = (fl.usable - GUTTER) / 2;
      const x = fl.left + colW + GUTTER;
      // Each line sits on its own highlight band, so the contents read as the
      // report's headlines rather than as a paragraph of small print.
      for (const line of inside) {
        const lines = fl.wrap(line, f.bold, 9, colW - 18);
        const h = lines.length * 12 + 9;
        fl.ensure(h + 5);
        const top = fl.y;
        if (!fl.dryRun) {
          fl.page.drawRectangle({ x, y: top - h, width: colW, height: h, color: C.accentSoft });
          fl.page.drawRectangle({ x, y: top - h, width: 2.5, height: h, color: C.accent });
          lines.forEach((l, i) => fl.page.drawText(l, { x: x + 11, y: top - 15 - i * 12, size: 9, font: f.bold, color: C.dark }));
          fl.transcript.push(line);
        }
        fl.y = top - h - 5;
      }
      fl.gap(SPACE.xs);
      fl.link(`Read it online: ${input.reportUrl}`, input.reportUrl, { size: 6.5, x, maxWidth: colW, lineHeight: 8.5 });
    },
  );
  fl.gap(SPACE.md);
  await screenshotStrip(fl, f, perf, { maxH: 150 });
  // The cover ends on the imagery: the summary above already names the one to fix
  // first, and the full tally of everything else is on the closing page.
}

// ───────── 2. What Google sees ─────────
async function googlePage(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, perf: PerfRow[], b: ReportBriefing) {
  const view = buildPerformanceView(perf);
  const page = view.pages.find((p) => p.pageType === "home") ?? view.pages[0];
  const row = page?.mobile ?? page?.desktop ?? null;
  if (!row || row.status !== "ok") return false;

  fl.newPage();
  fl.label("What Google sees", "PageSpeed Insights");
  kicker(fl, f, "Google's own measurements", b.practice.domain);
  fl.display("This Is Your Homepage, As Google Sees It", "As Google Sees It", { size: STORY_DISPLAY - 6, lineHeight: (STORY_DISPLAY - 6) * 1.02 });
  fl.gap(SPACE.md);
  fl.text("Google tests one page on one device at a time. These are its scores for your homepage, and the screenshots its test captured — the first thing a visitor sees.", { font: f.serifItalic, size: 12, color: C.ink, lineHeight: 17 });
  fl.gap(SPACE.xl);
  googleRings(fl, f, perf, { radius: 40 });
  fl.gap(SPACE.xl);
  await screenshotStrip(fl, f, perf, { maxH: 230, caption: "The page Google tested" });
  fl.gap(SPACE.md);
  fl.text("Google's measurements of this one page on this one device — not the same thing as the audit score, which covers every page we crawled.", { size: 8, color: C.muted });
  return true;
}

// ───────── 3..5. One story per problem ─────────
function story(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, p: BriefingProblem, i: number, total: number) {
  fl.newPage();
  fl.label(`Problem ${i + 1} of ${total}`, p.area);
  kicker(fl, f, `Story 0${i + 1}`, p.tag);
  fl.display(p.storyHeadline, p.storyHighlight, { size: STORY_DISPLAY, lineHeight: STORY_DISPLAY * 1.02 });
  fl.gap(SPACE.md);
  fl.text(p.implication, { font: f.serifItalic, size: 12.5, color: C.ink, lineHeight: 18 });
  fl.gap(SPACE.lg);
  metricChip(fl, f, p.chip, SEVERITY_COLOR[p.severity] ?? C.accent, `${p.severityLabel} · ${p.headline}`, p.chipNote);
  fl.gap(SPACE.xl);
  columns(
    fl,
    f,
    "What's happening",
    () => {
      const colW = (fl.usable - GUTTER) / 2;
      for (const para of p.happening) {
        fl.text(para, { size: 9.5, color: C.ink, x: fl.left, maxWidth: colW, lineHeight: 14.5 });
        fl.gap(SPACE.sm);
      }
    },
    "How to fix it",
    () => {
      const colW = (fl.usable - GUTTER) / 2;
      const x = fl.left + colW + GUTTER;
      p.fixes.forEach((fix, n) => {
        const y0 = fl.y;
        if (!fl.dryRun) fl.page.drawText(`0${n + 1}`, { x, y: y0 - 12, size: 13, font: f.bold, color: C.accent });
        fl.text(fix.title, { font: f.bold, size: 10, color: C.dark, x: x + 28, maxWidth: colW - 28, lineHeight: 13.5 });
        fl.text(fix.detail, { size: 9.5, color: C.secondary, x: x + 28, maxWidth: colW - 28, lineHeight: 14 });
        fl.gap(SPACE.md);
      });
      if (!p.fixes.length) fl.text(p.action, { size: 9, color: C.ink, x: x, maxWidth: colW, lineHeight: 12.5 });
    },
  );
  bottomStrip(fl, f, "What you'll get", `${p.action} ${p.target}`);
}

// ───────── 5. Local competitors ─────────
function competitorsSection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, cmp: LocalComparison) {
  const cols: ComparisonMetricKey[] = ["performanceScore", "lcpMs", "accessibility", "bestPractices", "seo"];
  const colLabel: Record<ComparisonMetricKey, string> = { performanceScore: "Performance", lcpMs: "Main content", accessibility: "Accessibility", bestPractices: "Best practices", seo: "Google SEO" };
  const fmt = (key: ComparisonMetricKey, v: number | null) => (v === null ? "-" : key === "lcpMs" ? `${(v / 1000).toFixed(1)} s` : `${v}/100`);
  // Pending (never tested) and a genuine measurement failure are different states and are never conflated.
  const state = (e: ComparisonEntry) => (e.measurement?.status === "ok" ? "ok" : !e.measurement && !e.measuredAt ? "pending" : "failed");
  const leads = (key: ComparisonMetricKey, v: number | null, p: number | null | undefined) => (v === null || p === null || p === undefined ? false : key === "lcpMs" ? v < p : v > p);
  const advantages = cmp.gaps.filter((g) => g.direction === "competitor_better");
  const measured = cmp.competitors.filter((c) => state(c) === "ok").length;
  const ahead = new Set(advantages.map((g) => g.competitor));
  const pending = cmp.competitors.filter((c) => state(c) === "pending");
  const shown = ahead.size > 0 ? cmp.competitors.filter((c) => ahead.has(c.name) || state(c) === "pending") : cmp.competitors;
  const shownNames = new Set(shown.map((c) => c.name));
  const strengths = cmp.gaps.filter((g) => g.direction === "practice_better" && shownNames.has(g.competitor));

  fl.newPage();
  fl.label("Local comparison", "Nearby practices");
  kicker(fl, f, "The comparison", `${measured} of ${cmp.competitors.length} nearby practices measured`);
  const headline = advantages.length > 0 ? "Nearby Practices Are Beating Your Page" : "How Your Page Measures Up Nearby";
  fl.display(headline, advantages.length > 0 ? "Beating Your Page" : "Measures Up Nearby", { size: STORY_DISPLAY - 4, lineHeight: (STORY_DISPLAY - 4) * 0.98 });
  fl.gap(8);
  fl.text(
    ahead.size > 0
      ? `${ahead.size} of the ${measured} nearby ${measured === 1 ? "practice" : "practices"} we measured scored ahead of your homepage on at least one of the five measures — those are the ones below.${pending.length ? ` ${pending.length} more ${pending.length === 1 ? "is" : "are"} still being analysed.` : ""}`
      : `${measured} of ${cmp.competitors.length} nearby ${cmp.competitors.length === 1 ? "practice" : "practices"} could be measured.`,
    { font: f.serifItalic, size: 12, color: C.ink, lineHeight: 16 },
  );
  fl.gap(4);
  fl.text("Same Google PageSpeed test: mobile, homepage, the test used on your site. Website measurements only: not rankings, patient numbers or how well a practice is doing.", { size: 8.5, color: C.secondary });
  fl.gap(12);

  const nameW = 168;
  const colW = (fl.usable - nameW) / cols.length;
  const fit = (str: string, font: typeof f.bold, size: number, maxW = nameW - 10) => {
    let t = pdfSafe(str);
    if (font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) t = t.slice(0, -1);
    return pdfSafe(`${t.trimEnd()}…`);
  };
  const shownUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const rows: Array<{ label: string; entry: ComparisonEntry }> = [{ label: `${cmp.practice.name} (you)`, entry: cmp.practice }, ...shown.map((c) => ({ label: c.name, entry: c }))];

  fl.keepTogether(() => {
    const top = fl.y;
    if (!fl.dryRun) {
      fl.page.drawText("PRACTICE / WEBSITE", { x: fl.left, y: top - 8, size: 6.5, font: f.bold, color: C.muted });
      cols.forEach((key, i) => fl.page.drawText(pdfSafe(colLabel[key].toUpperCase()), { x: fl.left + nameW + i * colW, y: top - 8, size: 6.5, font: f.bold, color: C.muted }));
    }
    fl.y = top - 12;
    fl.rule(C.dark);
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
        const pm = cmp.practice.measurement?.status === "ok" ? cmp.practice.measurement : null;
        if (st === "ok") {
          cols.forEach((key, i) => {
            const x = fl.left + nameW + i * colW;
            if (!isPractice && ahead.size > 0 && !leads(key, m![key], pm?.[key] ?? null)) {
              fl.page.drawText("-", { x, y: y0 - 16, size: 10, font: f.bold, color: C.faint });
              return;
            }
            if (key === "performanceScore" && m![key] !== null) {
              fl.ring(x + 13, y0 - 16, 13, m![key], googleLevel(m![key]!), { stroke: 3.5, numberSize: 10 });
              return;
            }
            fl.page.drawText(fmt(key, m![key]), { x, y: y0 - 16, size: m![key] !== null ? 10 : 8, font: m![key] !== null ? f.bold : f.regular, color: m![key] !== null ? C.ink : C.faint });
          });
        } else {
          fl.page.drawText(st === "pending" ? "Analysis in progress" : "Could not be measured", { x: fl.left + nameW, y: y0 - 16, size: 8, font: f.regular, color: C.faint });
        }
        const cells = st === "ok" ? cols.map((key) => `${colLabel[key]} ${!isPractice && ahead.size > 0 && !leads(key, m![key], pm?.[key] ?? null) ? "-" : fmt(key, m![key])}`).join(", ") : "";
        fl.transcript.push(`${r.label}${r.entry.website ? ` (${r.entry.website})` : ""}: ${st === "ok" ? cells : st === "pending" ? "Analysis in progress" : "Could not be measured"}`);
      }
      fl.y = y0 - 36;
      fl.rule();
    }
  });

  fl.gap(6);
  if (ahead.size > 0) {
    fl.text("A dash means that practice did not measure ahead of your homepage on that measure, so no number is shown for it.", { size: 7.5, color: C.muted });
    fl.gap(4);
  }
  columns(
    fl,
    f,
    "Where they beat you",
    () => {
      const colW2 = (fl.usable - GUTTER) / 2;
      if (!advantages.length) fl.text("No difference large enough to call out on the measurements available.", { size: 9, color: C.secondary, x: fl.left, maxWidth: colW2, lineHeight: 12.5 });
      for (const g of advantages) {
        fl.text(`${METRIC_LABEL[g.metric]}: ${g.sentence}`, { size: 8.5, color: C.ink, x: fl.left, maxWidth: colW2, lineHeight: 11.5 });
        fl.gap(3);
      }
    },
    "Where you beat them",
    () => {
      const colW2 = (fl.usable - GUTTER) / 2;
      const x = fl.left + colW2 + GUTTER;
      if (!strengths.length) fl.text("Nothing measured ahead on the practices shown here.", { size: 9, color: C.secondary, x, maxWidth: colW2, lineHeight: 12.5 });
      for (const g of strengths) {
        fl.text(g.sentence, { size: 8.5, color: C.secondary, x, maxWidth: colW2, lineHeight: 11.5 });
        fl.gap(3);
      }
    },
  );
  if (cmp.narrative) {
    fl.gap(6);
    fl.text(cmp.narrative.text, { size: 8.5, color: C.ink, lineHeight: 11.5 });
    fl.text("Written from the measurements above; every number is from the data.", { size: 6.5, color: C.muted });
  }
  bottomStrip(fl, f, "How this comparison was made", `${cmp.method} ${cmp.attribution}.`, { size: 6.5, maxLines: 5, bold: false });
}

// ───────── 6. What it could be worth ─────────
function opportunitySection(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, sc: OpportunityScenario, input: ReportPdfInput) {
  const rateKeys: OpportunityInputKey[] = ["currentRate", "targetRate", "patientRate"];
  const fmtInput = (key: OpportunityInputKey, v: SourcedValue) => (rateKeys.includes(key) ? `${num(v.value * 100)}%` : key === "contribution" ? cad(v.value) : num(v.value));
  const sourceWord: Record<SourcedValue["source"], string> = { ga4: "Google Analytics", gsc: "Search Console", crm: "booking data", finance: "practice financials", practice_provided: "provided by the practice", assumption: "assumption", illustrative: "starting figure" };
  const used = (Object.keys(sc.inputs) as OpportunityInputKey[]).filter((k) => sc.inputs[k]);
  const tag = sc.illustrative ? "Estimate — built on starting figures, not your analytics" : sc.mode === "verified" ? "Practice-specific scenario — estimate" : sc.mode === "partial" ? "Partial scenario — estimate" : "No dollar figure — data not authorised";

  fl.newPage();
  fl.label("The opportunity", "Business you could be losing");
  kicker(fl, f, "The maths", tag);
  fl.display("How Much Business Are You Losing Without Realizing It?", "Without Realizing It?", { size: STORY_DISPLAY - 6, lineHeight: (STORY_DISPLAY - 6) * 0.98 });
  fl.gap(8);
  fl.text(
    sc.mode === "verified"
      ? `A scenario built from the data ${input.business.name} authorised, with one stated improvement assumption.`
      : sc.mode === "partial"
        ? `Built from the data ${input.business.name} authorised so far - only what that data supports is shown.`
        : sc.mode === "illustrative"
          ? "Worked on the starting figures we use with every practice until yours are shared. Every input is listed here - change any of them and the number changes."
          : "This audit measured the website, not your visitors, enquiries or income - so no dollar figure is shown.",
    { font: f.serifItalic, size: 12, color: C.ink, lineHeight: 16 },
  );
  fl.gap(14);

  if (sc.figures.monthlyContribution !== null) {
    metricChip(fl, f, cad(sc.figures.monthlyContribution), C.growth, "Potential additional contribution a month under this scenario", `About ${cad(sc.figures.dailyContribution!)} a day over 30 days${sc.figures.additionalEnquiries !== null ? `, from ${num(sc.figures.additionalEnquiries)} additional enquiries a month` : ""}${sc.figures.additionalPatients !== null ? ` and ${num(sc.figures.additionalPatients)} additional patients` : ""}.${sc.illustrative ? " Built on the starting figures listed here, not on your analytics." : ""}`);
  } else if (sc.figures.additionalEnquiries !== null) {
    metricChip(fl, f, num(sc.figures.additionalEnquiries), C.accent, "Additional enquiries a month under this scenario", `A dollar figure needs ${sc.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(" and ")} - not authorised yet, so none is shown.`);
  } else {
    metricChip(fl, f, null, C.accent, "No dollar figure is shown for this practice", "Share your visitors, enquiry rate and what a new patient is worth in a website review and we will build this scenario with your figures.");
  }

  fl.gap(16);
  columns(
    fl,
    f,
    "How it is worked out",
    () => {
      const colW = (fl.usable - GUTTER) / 2;
      fl.text("Additional enquiries a month = monthly visitors × (improved enquiry rate minus current enquiry rate).", { size: 9, color: C.ink, x: fl.left, maxWidth: colW, lineHeight: 12.5 });
      fl.gap(5);
      fl.text("Additional patients = additional enquiries × the share of enquiries that become patients.", { size: 9, color: C.ink, x: fl.left, maxWidth: colW, lineHeight: 12.5 });
      fl.gap(5);
      fl.text("Contribution = additional patients × contribution per new patient; per day = monthly ÷ 30.", { size: 9, color: C.ink, x: fl.left, maxWidth: colW, lineHeight: 12.5 });
      fl.gap(5);
      fl.text("One calculation for the whole report. No separate loss is added up per issue, and no figure comes from the audit score, PageSpeed or the competitor measurements.", { size: 8, color: C.muted, x: fl.left, maxWidth: colW, lineHeight: 11.5 });
    },
    sc.illustrative ? "Starting figures used" : "Inputs used",
    () => {
      const colW = (fl.usable - GUTTER) / 2;
      const x = fl.left + colW + GUTTER;
      for (const k of used) {
        const v = sc.inputs[k]!;
        fl.text(`${INPUT_LABEL[k]}: ${fmtInput(k, v)} (${sourceWord[v.source]}${v.period ? `, ${v.period}` : ""})`, { size: 9, color: C.ink, x, maxWidth: colW, lineHeight: 12.5 });
        fl.gap(3);
      }
      if (!used.length) fl.text("No authorised analytics, booking or financial data for this practice yet.", { size: 9, color: C.ink, x, maxWidth: colW, lineHeight: 12.5 });
      if (sc.periods.length) {
        fl.gap(4);
        fl.text(`Measurement period: ${sc.periods.join("; ")}.`, { size: 8, color: C.muted, x, maxWidth: colW, lineHeight: 11.5 });
      }
      for (const a of sc.assumptions) {
        fl.gap(4);
        fl.text(a, { size: 8, color: C.muted, x, maxWidth: colW, lineHeight: 11.5 });
      }
    },
  );
  bottomStrip(fl, f, "Read this as", sc.disclaimer);
}

// ───────── 7. What to do next + how to reach us ─────────
function closing(fl: Flow, f: Awaited<ReturnType<typeof loadFonts>>, b: ReportBriefing, input: ReportPdfInput) {
  fl.newPage();
  fl.label("What to do next", "Talk to us");
  kicker(fl, f, "Your next moves", `${b.actions.length} action${b.actions.length === 1 ? "" : "s"}, in order`);
  fl.display("Start Here. We'll Do The Rest With You.", "We'll Do The Rest With You.", { size: STORY_DISPLAY - 6, lineHeight: (STORY_DISPLAY - 6) * 0.98 });
  fl.gap(10);

  b.actions.forEach((a, i) => {
    fl.keepTogether(() => {
      const top = fl.y;
      if (!fl.dryRun) fl.page.drawText(`0${i + 1}`, { x: fl.left, y: top - 15, size: 17, font: f.bold, color: C.accent });
      const x = fl.left + 32;
      fl.text(a.title, { font: f.bold, size: 11.5, color: C.dark, x, maxWidth: fl.usable - 32 });
      fl.text(a.detail, { size: 9.5, color: C.secondary, x, maxWidth: fl.usable - 32 });
      fl.text(`${a.severityLabel}${a.whenLabel ? ` · ${a.whenLabel.toLowerCase()}` : ""} · ${a.ownerLabel}`, { font: f.bold, size: 7.5, color: SEVERITY_COLOR[a.severity] ?? C.muted, x, maxWidth: fl.usable - 32 });
      fl.gap(9);
    });
  });
  fl.text("Severity is the audit's own rating of each finding. Fixing these addresses what we measured; it is not a promise of rankings, enquiries or revenue.", { size: 7.5, color: C.muted });
  if (b.more.total > 0) {
    fl.gap(10);
    fl.text(`Also found: ${b.more.total} further finding${b.more.total === 1 ? "" : "s"} — ${b.more.byArea.map((a) => `${a.count} ${a.label.toLowerCase()}`).join(", ")}.`, { font: f.bold, size: 9, color: C.dark });
    if (b.more.titles.length) fl.text(`${b.more.titles.join("; ")}${b.more.total > b.more.titles.length ? "; and more" : ""}. Every one is listed with its full evidence in the technical report.`, { size: 8, color: C.muted });
  }
  fl.gap(16);

  // Direct contact — a person, a phone number and an email, not a form.
  const pad = 16;
  const inner = () => {
    const x = fl.left + pad;
    const w = fl.usable - pad * 2;
    fl.text("TALK TO A HUMAN ABOUT THIS REPORT", { font: f.bold, size: 7.5, color: C.accentInk, x, maxWidth: w });
    fl.gap(4);
    fl.text("Call or email us and we'll walk you through the findings, explain the opportunities and help you decide what to fix first. Fifteen minutes, no pitch.", { size: 10, color: C.dark, x, maxWidth: w, lineHeight: 14 });
    fl.gap(8);
    const y0 = fl.y;
    if (!fl.dryRun) {
      fl.page.drawText(pdfSafe(CONTACT.phone.display), { x, y: y0 - 17, size: 19, font: f.bold, color: C.dark });
      fl.addLinkAnnotation(fl.page, x, y0 - 20, f.bold.widthOfTextAtSize(pdfSafe(CONTACT.phone.display), 19), 22, CONTACT.phone.href);
      fl.transcript.push(`${CONTACT.phone.display} -> ${CONTACT.phone.href}`);
    }
    fl.y = y0 - 24;
    fl.link(CONTACT.email, `mailto:${CONTACT.email}`, { size: 11, x });
    fl.gap(4);
    fl.link("Or book a 15-minute website review online", input.consultationUrl, { size: 10, x });
    fl.text(input.consultationUrl, { size: 7.5, color: C.muted, x, maxWidth: w });
  };
  fl.keepTogether(() => {
    const h = fl.measure(inner) + pad * 2;
    if (!fl.dryRun) {
      fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: fl.usable, height: h, color: C.accentSoft, borderColor: C.accent, borderWidth: 1 });
      fl.page.drawRectangle({ x: fl.left, y: fl.y - h, width: 4, height: h, color: C.accent });
    }
    fl.y -= pad;
    inner();
    fl.y -= pad;
  });

  fl.gap(10);
  fl.link("Request your full technical report", input.technicalReportRequestUrl, { size: 9.5 });
  fl.text("Every measurement, affected URL and developer instruction — provided by our team after a website review, not sent automatically.", { size: 7.5, color: C.muted });
  fl.gap(4);
  fl.text("This report is based only on data collected during the audit; scores describe how the site measured on the audit date and are not predictions of rankings, traffic or revenue.", { size: 7, color: C.muted });
}

export async function renderCustomerPdf(input: ReportPdfInput): Promise<PdfOutput> {
  const { payload, business } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`SEO Audit — ${business.name}`);
  doc.setAuthor("Smile AI Marketing");
  doc.setCreationDate(input.completedAt);
  const f = await loadFonts(doc);
  const date = dateLabel(input.completedAt);
  const fl = new Flow(doc, f, { business: business.name, date, url: input.reportUrl, kind: "Website report" }, MARGIN);

  const briefing = buildBriefing({
    business: { name: business.name, website: business.website, city: business.city },
    scores: payload.scores ? { overall: payload.scores.overall, performance: payload.scores.performance } : null,
    severityCounts: payload.severityCounts,
    findings: payload.findings.map(toBriefingFinding),
    pagesCrawled: ((payload.crawlStats as { pagesCrawled?: number } | null)?.pagesCrawled ?? 0) as number,
    checksRun: payload.checks.filter((c) => c.status === "PASS" || c.status === "FAIL").length,
  });

  const hasGooglePage = ((payload.performance ?? []) as unknown as PerfRow[]).some((r) => r.status === "ok");
  const inside = [
    hasGooglePage ? "Your homepage, as Google sees it." : null,
    ...briefing.problems.map((p, i) => `0${i + 1}  ${p.storyHeadline}`),
    payload.competitors ? "How you compare with nearby practices." : null,
    "How much business you could be losing without realizing it.",
    "Your next moves, and how to reach us.",
  ].filter((x): x is string => Boolean(x));

  await cover(fl, f, briefing, input, date, payload.performance as unknown as PerfRow[], inside);
  await googlePage(fl, f, payload.performance as unknown as PerfRow[], briefing);
  briefing.problems.forEach((p, i) => story(fl, f, p, i, briefing.problems.length));
  if (payload.competitors) competitorsSection(fl, f, payload.competitors);
  opportunitySection(fl, f, payload.opportunity, input);
  closing(fl, f, briefing, input);

  fl.finish();
  const bytes = await doc.save();
  return { bytes, pageCount: fl.pages.length, transcript: fl.transcript.join("\n") };
}
