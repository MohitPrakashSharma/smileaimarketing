import { THRESHOLDS, rate, cruxToRating, type Rating } from "@/lib/audit/providers/pagespeed";

/**
 * Pure view-model for the report's Performance section. Takes the rows the
 * report API returns (`v2.performance`) and produces what the UI renders —
 * per page × device: the Lighthouse score and the six user-facing metrics,
 * each tagged with where it came from (real users vs. lab). Nothing here
 * invents a value: a metric Google did not report is `value: null`.
 * Importable from the client (no server-only dependencies).
 */

export type Device = "mobile" | "desktop";

export interface PerfRow {
  url: string;
  strategy: string;
  pageType: string | null;
  selectionReason: string | null;
  status: string;
  error: string | null;
  field: { available: boolean; source: "url" | "origin" | null; overall: string | null; lcp: { percentile: number; category: string } | null; inp: { percentile: number; category: string } | null; cls: { percentile: number; category: string } | null; fcp: { percentile: number; category: string } | null; ttfb: { percentile: number; category: string } | null } | null;
  lab: { performanceScore: number | null; lcpMs: number | null; fcpMs: number | null; cls: number | null; tbtMs: number | null; speedIndexMs: number | null; ttiMs: number | null } | null;
  lcpElement: { snippet: string; url: string | null } | null;
  diagnostics: unknown;
  /** Google's other Lighthouse categories (null on audits stored before they were collected). */
  categories?: { accessibility: CategoryResultView | null; bestPractices: CategoryResultView | null; seo: CategoryResultView | null } | null;
  agentic?: AgenticResultView | null;
  lighthouseVersion?: string | null;
  analysisUtc?: string | null;
}

export interface CategoryAuditView {
  id: string;
  title: string;
  score: number | null;
  displayValue: string | null;
  weight: number;
}
export interface CategoryResultView {
  score: number | null;
  passed: number;
  applicable: number;
  failed: CategoryAuditView[];
}
export interface AgenticResultView {
  score: number | null;
  passed: number;
  applicable: number;
  checks: Array<CategoryAuditView & { mode: string | null; group: string | null }>;
}

export type GoogleCheckKey = "performance" | "accessibility" | "bestPractices" | "seo" | "agentic";

/** One of the five Google website checks for a page × device — `available: false` is an honest gap, never a 0. */
export interface GoogleCheckView {
  key: GoogleCheckKey;
  label: string;
  /** What Google's number actually covers, in one line. */
  scope: string;
  kind: "score" | "checklist";
  available: boolean;
  /** 0–100 for score kinds. */
  score: number | null;
  passed: number | null;
  applicable: number | null;
  failed: CategoryAuditView[];
  checks: AgenticResultView["checks"];
  unavailableReason: string | null;
}

export function googleChecksFor(row: PerfRow | null): GoogleCheckView[] {
  const cats = row?.categories ?? null;
  const notCollected = row ? "Not collected for this audit — re-run to include it." : "No PageSpeed result for this page and device.";
  const scoreCheck = (key: GoogleCheckKey, label: string, scope: string, c: CategoryResultView | null | undefined): GoogleCheckView =>
    c && c.score !== null
      ? { key, label, scope, kind: "score", available: true, score: c.score, passed: c.passed, applicable: c.applicable, failed: c.failed, checks: [], unavailableReason: null }
      : { key, label, scope, kind: "score", available: false, score: null, passed: null, applicable: null, failed: [], checks: [], unavailableReason: notCollected };
  const perfScore = row?.status === "ok" ? (row.lab?.performanceScore ?? null) : null;
  const performance: GoogleCheckView = { key: "performance", label: "Performance", scope: "How fast this page loads and responds (Lighthouse)", kind: "score", available: perfScore !== null, score: perfScore, passed: null, applicable: null, failed: [], checks: [], unavailableReason: perfScore === null ? (row?.error ? `Google could not measure performance for this page: ${row.error}` : notCollected) : null };
  const ag = row?.agentic ?? null;
  const agentic: GoogleCheckView = ag
    ? { key: "agentic", label: "Agentic Browsing", scope: "Can AI agents read and use this page (experimental Google check)", kind: "checklist", available: true, score: null, passed: ag.passed, applicable: ag.applicable, failed: [], checks: ag.checks, unavailableReason: null }
    : { key: "agentic", label: "Agentic Browsing", scope: "Can AI agents read and use this page (experimental Google check)", kind: "checklist", available: false, score: null, passed: null, applicable: null, failed: [], checks: [], unavailableReason: row ? "Google did not return this check for this run." : notCollected };
  return [
    performance,
    scoreCheck("accessibility", "Accessibility", "Can everyone use the page — contrast, labels, keyboard, screen readers", cats?.accessibility),
    scoreCheck("bestPractices", "Best Practices", "Security, modern web standards, no browser errors", cats?.bestPractices),
    scoreCheck("seo", "Google SEO", "Google's 10-point technical basics only — not our SEO audit", cats?.seo),
    agentic,
  ];
}

/** Metric groups for the performance detail — two rows instead of six loose cards. */
export function metricGroups(metrics: MetricView[]): Array<{ title: string; hint: string; metrics: MetricView[] }> {
  const pick = (keys: MetricKey[]) => keys.map((k) => metrics.find((m) => m.key === k)).filter((m): m is MetricView => Boolean(m));
  return [
    { title: "Loading", hint: "How quickly the page appears", metrics: pick(["lcp", "fcp", "si", "ttfb"]) },
    { title: "Interactivity & stability", hint: "How the page behaves once it's on screen", metrics: pick(["inp", "tbt", "cls"]) },
  ];
}

/** "9 September 2026" for a stored analysis timestamp, or null. */
export function testDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export type MetricKey = "lcp" | "inp" | "cls" | "fcp" | "ttfb" | "si" | "tbt";
export type MetricSource = "field" | "lab";

export interface MetricView {
  key: MetricKey;
  label: string;
  fullName: string;
  /** Plain-language explanation for a business owner. */
  explain: string;
  /** Primary value — field (real users) when Google has it, else lab. null = not reported. */
  value: number | null;
  display: string;
  source: MetricSource | null;
  /** Field "url" vs "origin" provenance when source is field. */
  fieldLevel: "url" | "origin" | null;
  rating: Rating | null;
  /** Lab value shown as secondary context when the primary is field data. */
  labDisplay: string | null;
  /** Why there is no value, when there isn't one. */
  unavailableReason: string | null;
  goodLabel: string;
}

export interface PageView {
  url: string;
  path: string;
  pageType: string | null;
  selectionReason: string | null;
  mobile: PerfRow | null;
  desktop: PerfRow | null;
}

export interface PerformanceViewModel {
  /** Rows with status ok grouped by URL; ordered homepage first, then by selection order. */
  pages: PageView[];
  hasMobile: boolean;
  hasDesktop: boolean;
  /** true when at least one page has ok rows for BOTH devices — the only case a toggle is offered. */
  canToggle: boolean;
  anyFieldData: boolean;
  totalRuns: number;
  /** Runs with at least one usable Google result. */
  okRuns: number;
  /** Runs where performance itself was measured. */
  perfOkRuns: number;
  failedRuns: Array<{ url: string; strategy: string; error: string | null }>;
}

export const fmtMs = (ms: number): string => (ms >= 10000 ? `${Math.round(ms / 1000)} s` : ms >= 1000 ? `${(Math.round(ms / 100) / 10).toFixed(1)} s` : `${Math.round(ms)} ms`);
export const fmtCls = (v: number): string => v.toFixed(v < 0.1 ? 3 : 2);

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "Homepage" : u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** A row is worth a tile when performance succeeded OR Google returned any other category for it. */
export const hasAnyResult = (r: PerfRow): boolean => (r.status === "ok" && Boolean(r.lab)) || Boolean(r.categories?.accessibility || r.categories?.bestPractices || r.categories?.seo || r.agentic);

export function buildPerformanceView(rows: PerfRow[]): PerformanceViewModel {
  const ok = rows.filter((r) => r.status === "ok" && r.lab);
  const usable = rows.filter(hasAnyResult);
  const byUrl = new Map<string, PageView>();
  for (const r of usable) {
    const p = byUrl.get(r.url) ?? { url: r.url, path: pathOf(r.url), pageType: r.pageType, selectionReason: r.selectionReason, mobile: null, desktop: null };
    if (r.strategy === "mobile") p.mobile = r;
    else if (r.strategy === "desktop") p.desktop = r;
    byUrl.set(r.url, p);
  }
  const pages = [...byUrl.values()].sort((a, b) => (a.pageType === "home" ? -1 : b.pageType === "home" ? 1 : 0));
  const hasMobile = pages.some((p) => p.mobile);
  const hasDesktop = pages.some((p) => p.desktop);
  return {
    pages,
    hasMobile,
    hasDesktop,
    canToggle: pages.some((p) => p.mobile && p.desktop),
    anyFieldData: ok.some((r) => r.field?.available),
    totalRuns: rows.length,
    okRuns: usable.length,
    perfOkRuns: ok.length,
    failedRuns: rows.filter((r) => !hasAnyResult(r)).map((r) => ({ url: r.url, strategy: r.strategy, error: r.error })),
  };
}

const NO_FIELD = "Needs real-visitor data, which Google doesn't have for this site yet.";

/** The six metrics for one page × device. Field data (CrUX) wins where Google has it; lab is the fallback and is labelled as such. */
export function metricsFor(row: PerfRow): MetricView[] {
  const f = row.field?.available ? row.field : null;
  const lab = row.lab;
  const fieldLevel = f?.source ?? null;

  const ms = (key: MetricKey, label: string, fullName: string, explain: string, fieldMetric: { percentile: number; category: string } | null | undefined, labValue: number | null | undefined, t: { good: number; poor: number }, goodLabel: string): MetricView => {
    if (fieldMetric) {
      return { key, label, fullName, explain, value: fieldMetric.percentile, display: fmtMs(fieldMetric.percentile), source: "field", fieldLevel, rating: cruxToRating(fieldMetric.category as "FAST" | "AVERAGE" | "SLOW"), labDisplay: labValue != null ? fmtMs(labValue) : null, unavailableReason: null, goodLabel };
    }
    if (labValue != null) return { key, label, fullName, explain, value: labValue, display: fmtMs(labValue), source: "lab", fieldLevel: null, rating: rate(labValue, t), labDisplay: null, unavailableReason: null, goodLabel };
    return { key, label, fullName, explain, value: null, display: "—", source: null, fieldLevel: null, rating: null, labDisplay: null, unavailableReason: "Not reported for this page.", goodLabel };
  };

  const lcp = ms("lcp", "LCP", "Largest Contentful Paint", "How long until the biggest thing on the screen — usually the hero image or headline — is visible.", f?.lcp, lab?.lcpMs, THRESHOLDS.lcpMs, "≤ 2.5 s");
  const fcp = ms("fcp", "FCP", "First Contentful Paint", "How long until anything at all appears on the screen.", f?.fcp, lab?.fcpMs, THRESHOLDS.fcpMs, "≤ 1.8 s");
  const si = ms("si", "Speed Index", "Speed Index", "How quickly the visible part of the page fills in during load.", null, lab?.speedIndexMs, THRESHOLDS.speedIndexMs, "≤ 3.4 s");
  const tbt = ms("tbt", "TBT", "Total Blocking Time", "How long JavaScript keeps the page frozen while it loads — the lab stand-in for responsiveness.", null, lab?.tbtMs, THRESHOLDS.tbtMs, "≤ 200 ms");
  const ttfb = ms("ttfb", "TTFB", "Time to First Byte", "How long the server takes to start sending the page.", f?.ttfb, null, THRESHOLDS.ttfbMs, "≤ 0.8 s");
  if (ttfb.value === null) ttfb.unavailableReason = NO_FIELD;

  // INP exists only as a field metric.
  const inp: MetricView = f?.inp
    ? { key: "inp", label: "INP", fullName: "Interaction to Next Paint", explain: "How quickly the page reacts when someone taps or clicks.", value: f.inp.percentile, display: fmtMs(f.inp.percentile), source: "field", fieldLevel, rating: cruxToRating(f.inp.category as "FAST" | "AVERAGE" | "SLOW"), labDisplay: null, unavailableReason: null, goodLabel: "≤ 200 ms" }
    : { key: "inp", label: "INP", fullName: "Interaction to Next Paint", explain: "How quickly the page reacts when someone taps or clicks.", value: null, display: "—", source: null, fieldLevel: null, rating: null, labDisplay: null, unavailableReason: NO_FIELD, goodLabel: "≤ 200 ms" };

  // CLS is unitless.
  const cls: MetricView = f?.cls
    ? { key: "cls", label: "CLS", fullName: "Cumulative Layout Shift", explain: "How much the page jumps around while it loads.", value: f.cls.percentile, display: fmtCls(f.cls.percentile), source: "field", fieldLevel, rating: cruxToRating(f.cls.category as "FAST" | "AVERAGE" | "SLOW"), labDisplay: lab?.cls != null ? fmtCls(lab.cls) : null, unavailableReason: null, goodLabel: "≤ 0.1" }
    : lab?.cls != null
      ? { key: "cls", label: "CLS", fullName: "Cumulative Layout Shift", explain: "How much the page jumps around while it loads.", value: lab.cls, display: fmtCls(lab.cls), source: "lab", fieldLevel: null, rating: rate(lab.cls, THRESHOLDS.cls), labDisplay: null, unavailableReason: null, goodLabel: "≤ 0.1" }
      : { key: "cls", label: "CLS", fullName: "Cumulative Layout Shift", explain: "How much the page jumps around while it loads.", value: null, display: "—", source: null, fieldLevel: null, rating: null, labDisplay: null, unavailableReason: "Not reported for this page.", goodLabel: "≤ 0.1" };

  // TTFB is field-only; it is shown only when Google reported it (the six core tiles are always present).
  return ttfb.value === null ? [lcp, inp, cls, fcp, si, tbt] : [lcp, inp, cls, fcp, si, tbt, ttfb];
}
