/**
 * Google PageSpeed Insights v5 provider (free; API key optional, raises quota).
 *
 * Returns a *normalized* result per URL × strategy. Field data (CrUX, real
 * users) and lab data (Lighthouse, simulated) are kept in separate objects
 * and never merged. Every failure mode maps to `status: "unavailable"` with
 * an errorCode — the caller decides what that means (never a 0 score).
 *
 * `fetchImpl` is injectable so tests run offline against fixture responses.
 */

export type Strategy = "mobile" | "desktop";
export type CruxCategory = "FAST" | "AVERAGE" | "SLOW";
export type PerfErrorCode = "timeout" | "rate_limited" | "rejected" | "malformed" | "http_error" | "network" | "disabled";

export interface FieldMetric {
  percentile: number;
  category: CruxCategory;
}

export interface FieldData {
  available: boolean;
  /** "url" = CrUX for this exact page; "origin" = origin-level fallback Google supplied instead */
  source: "url" | "origin" | null;
  overall: CruxCategory | null;
  lcp: FieldMetric | null; // ms
  inp: FieldMetric | null; // ms
  cls: FieldMetric | null; // unitless ×1 (PSI reports ×100; normalized here)
  fcp: FieldMetric | null; // ms
  ttfb: FieldMetric | null; // ms
}

export interface LabData {
  performanceScore: number | null; // 0–100
  lcpMs: number | null;
  fcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
  ttiMs: number | null; // only when Lighthouse still reports it
}

export interface DiagnosticItem {
  url?: string;
  label?: string;
  bytes?: number;
  wastedBytes?: number;
  wastedMs?: number;
  ms?: number;
}

export interface Diagnostic {
  id: string;
  title: string;
  /** Lighthouse score 0–1 (null for informative / not-applicable audits) */
  score: number | null;
  displayValue: string | null;
  numericValue: number | null;
  numericUnit: string | null;
  /** Legacy `details.overallSavingsMs`, else the largest ms-valued `metricSavings` entry (Lighthouse ≥ 12 insights). */
  savingsMs: number | null;
  /** Legacy `details.overallSavingsBytes`, else `debugData.wastedBytes`, else the sum of item `wastedBytes`. */
  savingsBytes: number | null;
  /** Lighthouse `metricSavings` as reported ({ LCP, FCP, TBT, INP, CLS }) — ms except CLS. */
  metricSavings: Record<string, number> | null;
  /** Checklist insights (document-latency, lcp-discovery): key → passed. */
  checklist: Record<string, boolean> | null;
  /** Sums over *all* items (before the cap), so thresholds don't depend on MAX_ITEMS. */
  totals: { count: number; bytes: number; wastedBytes: number; wastedMs: number; ms: number };
  items: DiagnosticItem[]; // capped
}

/** One failing (or partially failing) audit inside a Lighthouse category — enough to explain the score, never the raw audit. */
export interface CategoryAuditSummary {
  id: string;
  title: string;
  /** 0–1 */
  score: number | null;
  displayValue: string | null;
  weight: number;
}

/**
 * A Lighthouse category other than Performance (Accessibility, Best
 * Practices, SEO). `score` is Google's 0–100; `passed`/`applicable` count the
 * weighted, scored audits behind it; `failed` lists the ones that cost points.
 */
export interface CategoryResult {
  score: number | null;
  passed: number;
  applicable: number;
  failed: CategoryAuditSummary[];
}

/**
 * Lighthouse 13's "Agentic Browsing" category (`category=agentic-browsing`).
 * Its audits are binary / not-applicable, so the honest presentation is
 * "passed X of Y applicable checks" — the 0–1 category score is kept only
 * because Google reports it. Marked by Google as under development.
 */
export interface AgenticResult {
  score: number | null;
  passed: number;
  applicable: number;
  checks: Array<CategoryAuditSummary & { mode: string | null; group: string | null }>;
}

export interface CategoryScores {
  accessibility: CategoryResult | null;
  bestPractices: CategoryResult | null;
  seo: CategoryResult | null;
}

/**
 * The screenshot Lighthouse took of the finished page, as returned in the same
 * PSI response we already fetch (`audits["final-screenshot"]`). No extra call
 * is ever made for it. Stored only for the homepage rows and only when it is
 * small enough to sit in the report; anything larger is dropped rather than
 * bloating the audit.
 */
export interface PerfScreenshot {
  /** "data:image/jpeg;base64,…" exactly as Lighthouse returned it. */
  dataUri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number;
}

/** Above this the screenshot is dropped: the report shows a thumbnail, not a full-page capture. */
export const SCREENSHOT_MAX_BYTES = 600_000;

export function parseScreenshot(lhr: Record<string, unknown>): PerfScreenshot | null {
  const audits = obj(lhr.audits) ?? {};
  const details = obj(obj(audits["final-screenshot"])?.details);
  const data = str(details?.data) ?? str(obj(obj(lhr.fullPageScreenshot)?.screenshot)?.data);
  if (!data) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data.trim());
  if (!m) return null;
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes > SCREENSHOT_MAX_BYTES || bytes < 500) return null;
  const width = num(details?.width) ?? num(obj(obj(lhr.fullPageScreenshot)?.screenshot)?.width);
  const height = num(details?.height) ?? num(obj(obj(lhr.fullPageScreenshot)?.screenshot)?.height);
  return { dataUri: data.trim(), mimeType: m[1], width, height, bytes };
}

export interface PerfResult {
  url: string;
  finalUrl: string | null;
  strategy: Strategy;
  status: "ok" | "unavailable";
  error?: string;
  errorCode?: PerfErrorCode;
  field: FieldData;
  lab: LabData | null;
  diagnostics: Diagnostic[];
  lcpElement: { snippet: string; url: string | null } | null;
  /** Google's other Lighthouse categories for the same run (null per category when not returned). */
  categories: CategoryScores;
  /** Agentic Browsing category when Google returned it (null otherwise — never inferred). */
  agentic: AgenticResult | null;
  /** Lighthouse's own screenshot of the finished page, from this same response (null when absent or too large). */
  screenshot: PerfScreenshot | null;
  lighthouseVersion: string | null;
  analysisUtc: string | null;
  ms: number;
}

/** Lighthouse categories requested from PSI. `agentic-browsing` exists on PSI's Lighthouse 13; older backends reject it and we retry without it. */
export const PSI_CATEGORIES = ["performance", "accessibility", "best-practices", "seo", "agentic-browsing"] as const;
export const noCategories = (): CategoryScores => ({ accessibility: null, bestPractices: null, seo: null });

/**
 * Lighthouse audits we normalize (diagnostics/opportunities). Everything else
 * is dropped. PSI moved to Lighthouse 13 (2026), which replaced most legacy
 * opportunity audits with `*-insight` audits; both generations are listed so
 * the checks work whichever one Google serves (verified live on LH 13.4.1).
 */
export const DIAGNOSTIC_IDS = [
  // Lighthouse ≤ 12 (legacy) audits
  "render-blocking-resources",
  "unused-javascript",
  "unused-css-rules",
  "unminified-javascript",
  "unminified-css",
  "uses-optimized-images",
  "uses-responsive-images",
  "modern-image-formats",
  "offscreen-images",
  "uses-long-cache-ttl",
  "uses-text-compression",
  "third-party-summary",
  "dom-size",
  "mainthread-work-breakdown",
  "bootup-time",
  "server-response-time",
  "font-display",
  "total-byte-weight",
  "long-tasks",
  "critical-request-chains",
  "largest-contentful-paint-element",
  "lcp-lazy-loaded",
  "prioritize-lcp-image",
  "uses-rel-preconnect",
  "redirects",
  "layout-shifts",
  "legacy-javascript",
  // Lighthouse ≥ 13 insight audits (successors of the above)
  "render-blocking-insight", // ← render-blocking-resources
  "cache-insight", // ← uses-long-cache-ttl
  "document-latency-insight", // ← uses-text-compression + redirects + server-response-time (checklist)
  "third-parties-insight", // ← third-party-summary
  "dom-size-insight", // ← dom-size
  "font-display-insight", // ← font-display
  "image-delivery-insight", // ← uses-optimized-images / modern-image-formats / uses-responsive-images
  "lcp-breakdown-insight", // ← largest-contentful-paint-element (carries the LCP node)
  "lcp-discovery-insight", // ← lcp-lazy-loaded + prioritize-lcp-image (checklist)
  "legacy-javascript-insight", // ← legacy-javascript
  "duplicated-javascript-insight",
  "unsized-images",
  "cls-culprits-insight",
] as const;

const MAX_ITEMS = 5;

export const noField = (): FieldData => ({ available: false, source: null, overall: null, lcp: null, inp: null, cls: null, fcp: null, ttfb: null });

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function fieldMetric(m: unknown, divide = 1): FieldMetric | null {
  const o = obj(m);
  if (!o) return null;
  const p = num(o.percentile);
  const c = str(o.category);
  if (p === null || !c || !["FAST", "AVERAGE", "SLOW"].includes(c)) return null;
  return { percentile: p / divide, category: c as CruxCategory };
}

function parseField(exp: unknown, source: "url" | "origin"): FieldData | null {
  const o = obj(exp);
  const metrics = o ? obj(o.metrics) : null;
  if (!o || !metrics || Object.keys(metrics).length === 0) return null;
  const overall = str(o.overall_category);
  return {
    available: true,
    source,
    overall: overall && ["FAST", "AVERAGE", "SLOW"].includes(overall) ? (overall as CruxCategory) : null,
    lcp: fieldMetric(metrics.LARGEST_CONTENTFUL_PAINT_MS),
    inp: fieldMetric(metrics.INTERACTION_TO_NEXT_PAINT),
    cls: fieldMetric(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE, 100), // PSI reports CLS ×100
    fcp: fieldMetric(metrics.FIRST_CONTENTFUL_PAINT_MS),
    ttfb: fieldMetric(metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
  };
}

function parseLab(lhr: Json): LabData | null {
  const audits = obj(lhr.audits);
  const cats = obj(lhr.categories);
  const perf = cats ? obj(cats.performance) : null;
  if (!audits) return null;
  const nv = (id: string) => num(obj(audits[id])?.numericValue);
  const score = perf ? num(perf.score) : null;
  return {
    performanceScore: score === null ? null : Math.round(score * 100),
    lcpMs: nv("largest-contentful-paint"),
    fcpMs: nv("first-contentful-paint"),
    cls: nv("cumulative-layout-shift"),
    tbtMs: nv("total-blocking-time"),
    speedIndexMs: nv("speed-index"),
    ttiMs: nv("interactive"),
  };
}

const MS_SAVINGS_KEYS = ["LCP", "FCP", "TBT", "INP", "TTI", "SI"]; // CLS is unitless and excluded

/**
 * Rows from an audit's `details`, whatever its shape: `table`/`opportunity`
 * (items), `list` (sections that are tables, nodes or checklists — flattened),
 * `checklist` (no rows). Also returns any checklist found along the way.
 */
function collectRows(details: Json | null): { rows: Json[]; checklist: Record<string, boolean> | null } {
  if (!details) return { rows: [], checklist: null };
  let checklist: Record<string, boolean> | null = null;
  const readChecklist = (d: Json) => {
    const items = obj(d.items);
    if (!items) return;
    for (const [k, v] of Object.entries(items)) {
      const val = obj(v)?.value;
      if (typeof val === "boolean") checklist = { ...(checklist ?? {}), [k]: val };
    }
  };
  if (details.type === "checklist") {
    readChecklist(details);
    return { rows: [], checklist };
  }
  if (details.type === "list" && Array.isArray(details.items)) {
    const rows: Json[] = [];
    for (const section of details.items as unknown[]) {
      const sec = obj(section);
      if (!sec) continue;
      if (sec.type === "checklist") readChecklist(sec);
      else if (sec.type === "node") rows.push({ node: sec });
      else if (Array.isArray(sec.items)) rows.push(...(sec.items as unknown[]).map(obj).filter((r): r is Json => Boolean(r)));
      else if (obj(sec.value) && Array.isArray(obj(sec.value)!.items)) rows.push(...(obj(sec.value)!.items as unknown[]).map(obj).filter((r): r is Json => Boolean(r)));
    }
    return { rows, checklist };
  }
  // table / opportunity: plain rows. A row that is itself a table (the legacy
  // LCP-element audit nests its node one level down) is flattened.
  const rows: Json[] = [];
  for (const r of Array.isArray(details.items) ? (details.items as unknown[]).map(obj).filter((r): r is Json => Boolean(r)) : []) {
    if (Array.isArray(r.items) && !r.node && !r.url) rows.push(...(r.items as unknown[]).map(obj).filter((x): x is Json => Boolean(x)));
    else rows.push(r);
  }
  return { rows, checklist };
}

const SECRET_PARAMS = /^(key|api_?key|token|access_token|auth|signature|sig|secret|password)$/i;

/** Third-party resource URLs on the audited site can embed that site's own API keys — never store or republish them. */
function scrubUrl(u: string | null): string | null {
  if (!u || !u.includes("?")) return u;
  try {
    const parsed = new URL(u);
    let touched = false;
    for (const k of [...parsed.searchParams.keys()]) if (SECRET_PARAMS.test(k)) { parsed.searchParams.set(k, "[redacted]"); touched = true; }
    return touched ? parsed.toString() : u;
  } catch {
    return u;
  }
}

function parseItem(o: Json): DiagnosticItem {
  const entity = obj(o.entity);
  const node = obj(o.node);
  const source = obj(o.source);
  return {
    url: scrubUrl(str(o.url)) ?? str(o.entity) ?? str(entity?.text) ?? scrubUrl(str(source?.url)) ?? undefined,
    label: str(o.label) ?? str(o.groupLabel) ?? str(o.statistic) ?? str(o.entity) ?? str(node?.snippet)?.slice(0, 160) ?? str(entity?.text) ?? str(o.reason) ?? undefined,
    bytes: num(o.totalBytes) ?? num(o.transferSize) ?? undefined,
    wastedBytes: num(o.wastedBytes) ?? undefined,
    wastedMs: num(o.wastedMs) ?? num(o.blockingTime) ?? undefined,
    ms: num(o.duration) ?? num(o.total) ?? num(o.mainThreadTime) ?? num(o.reflowTime) ?? undefined,
  };
}

function parseDiagnostics(lhr: Json): { diagnostics: Diagnostic[]; lcpElement: PerfResult["lcpElement"] } {
  const audits = obj(lhr.audits) ?? {};
  const out: Diagnostic[] = [];
  let lcpElement: PerfResult["lcpElement"] = null;
  for (const id of DIAGNOSTIC_IDS) {
    const a = obj(audits[id]);
    if (!a) continue;
    const details = obj(a.details);
    const { rows, checklist } = collectRows(details);
    const all = rows.map(parseItem);
    const totals: Diagnostic["totals"] = { count: all.length, bytes: 0, wastedBytes: 0, wastedMs: 0, ms: 0 };
    for (const it of all) {
      totals.bytes += it.bytes ?? 0;
      totals.wastedBytes += it.wastedBytes ?? 0;
      totals.wastedMs += it.wastedMs ?? 0;
      totals.ms += it.ms ?? 0;
    }
    const metricSavingsRaw = obj(a.metricSavings);
    const metricSavings = metricSavingsRaw ? Object.fromEntries(Object.entries(metricSavingsRaw).filter(([, v]) => num(v) !== null) as Array<[string, number]>) : null;
    const msSavings = metricSavings ? Math.max(0, ...Object.entries(metricSavings).filter(([k]) => MS_SAVINGS_KEYS.includes(k)).map(([, v]) => v)) : null;
    const debug = details ? obj(details.debugData) : null;

    // LCP element: legacy audit carries it as items[0].items[0].node; the LH13 breakdown insight as a node section.
    if ((id === "largest-contentful-paint-element" || id === "lcp-breakdown-insight") && !lcpElement) {
      const nodeRow = rows.find((r) => obj(r.node)?.snippet);
      const node = nodeRow ? obj(nodeRow.node) : null;
      if (node?.snippet) lcpElement = { snippet: String(node.snippet).slice(0, 300), url: scrubUrl(str(nodeRow?.url)) };
    }
    out.push({
      id,
      title: str(a.title) ?? id,
      score: num(a.score),
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      numericUnit: str(a.numericUnit),
      savingsMs: num(details?.overallSavingsMs) ?? msSavings,
      savingsBytes: num(details?.overallSavingsBytes) ?? num(debug?.wastedBytes) ?? (all.some((it) => it.wastedBytes !== undefined) ? totals.wastedBytes : null),
      metricSavings,
      checklist,
      totals,
      items: all.slice(0, MAX_ITEMS),
    });
  }
  return { diagnostics: out, lcpElement };
}

const MAX_FAILED_AUDITS = 12;

function auditSummary(audits: Json, id: string, weight: number): CategoryAuditSummary | null {
  const a = obj(audits[id]);
  if (!a) return null;
  return { id, title: str(a.title) ?? id, score: num(a.score), displayValue: str(a.displayValue), weight };
}

/** Accessibility / Best Practices / SEO: Google's score plus the weighted audits that failed. */
function parseCategory(lhr: Json, id: string): CategoryResult | null {
  const cats = obj(lhr.categories);
  const cat = cats ? obj(cats[id]) : null;
  if (!cat) return null;
  const audits = obj(lhr.audits) ?? {};
  const refs = Array.isArray(cat.auditRefs) ? (cat.auditRefs as unknown[]).map(obj).filter((r): r is Json => Boolean(r)) : [];
  const scored = refs
    .map((r) => ({ id: str(r.id) ?? "", weight: num(r.weight) ?? 0 }))
    .filter((r) => r.id && r.weight > 0)
    .map((r) => auditSummary(audits, r.id, r.weight))
    .filter((a): a is CategoryAuditSummary => Boolean(a) && a!.score !== null);
  const failed = scored.filter((a) => (a.score ?? 1) < 1).sort((a, b) => b.weight - a.weight || (a.score ?? 0) - (b.score ?? 0));
  const score = num(cat.score);
  return { score: score === null ? null : Math.round(score * 100), passed: scored.length - failed.length, applicable: scored.length, failed: failed.slice(0, MAX_FAILED_AUDITS) };
}

/** Agentic Browsing: every audit in the category with its mode, so the UI can say "X of Y applicable checks passed" and list the rest as not applicable. */
function parseAgentic(lhr: Json): AgenticResult | null {
  const cats = obj(lhr.categories);
  const cat = cats ? obj(cats["agentic-browsing"]) : null;
  if (!cat) return null;
  const audits = obj(lhr.audits) ?? {};
  const refs = Array.isArray(cat.auditRefs) ? (cat.auditRefs as unknown[]).map(obj).filter((r): r is Json => Boolean(r)) : [];
  const checks = refs
    .map((r) => {
      const id = str(r.id) ?? "";
      const base = id ? auditSummary(audits, id, num(r.weight) ?? 0) : null;
      if (!base) return null;
      const a = obj(audits[id])!;
      return { ...base, mode: str(a.scoreDisplayMode), group: str(r.group) };
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  // Applicable = audits Lighthouse actually scored (binary/numeric); notApplicable/manual/informative are listed but not counted.
  const applicable = checks.filter((c) => c.score !== null && c.mode !== "notApplicable" && c.mode !== "manual" && c.mode !== "informative");
  // Lighthouse's own pass line: binary audits pass at 1, numeric audits (e.g. CLS) pass in the green band (≥ 0.9).
  const passed = applicable.filter((c) => (c.mode === "numeric" ? (c.score ?? 0) >= 0.9 : (c.score ?? 0) >= 1)).length;
  return { score: num(cat.score), passed, applicable: applicable.length, checks };
}

/** Pure normalizer — exported for tests and for re-normalizing stored data. */
export function normalizePsiResponse(url: string, strategy: Strategy, body: unknown, ms: number): PerfResult {
  const root = obj(body);
  const lhr = root ? obj(root.lighthouseResult) : null;
  if (!root || !lhr) {
    return { url, finalUrl: null, strategy, status: "unavailable", error: "response has no lighthouseResult", errorCode: "malformed", field: noField(), lab: null, diagnostics: [], lcpElement: null, categories: noCategories(), agentic: null, screenshot: null, lighthouseVersion: null, analysisUtc: null, ms };
  }
  const runtimeError = obj(lhr.runtimeError);
  if (runtimeError && str(runtimeError.code) && runtimeError.code !== "NO_ERROR") {
    return { url, finalUrl: str(lhr.finalUrl), strategy, status: "unavailable", error: `Lighthouse runtime error ${runtimeError.code}: ${str(runtimeError.message) ?? ""}`.trim(), errorCode: "rejected", field: noField(), lab: null, diagnostics: [], lcpElement: null, categories: noCategories(), agentic: null, screenshot: null, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
  }
  const lab = parseLab(lhr);
  const categories: CategoryScores = { accessibility: parseCategory(lhr, "accessibility"), bestPractices: parseCategory(lhr, "best-practices"), seo: parseCategory(lhr, "seo") };
  const agentic = parseAgentic(lhr);
  const screenshot = parseScreenshot(lhr);
  if (!lab || lab.performanceScore === null) {
    // Lighthouse can fail a single metric (e.g. NO_LCP) and leave the performance category unscored while
    // Accessibility / Best Practices / SEO / Agentic are perfectly valid. Performance is "unavailable" for
    // this run — never a 0 — but the other categories are kept.
    const audits = obj(lhr.audits) ?? {};
    const metricError = ["largest-contentful-paint", "total-blocking-time", "first-contentful-paint", "speed-index", "cumulative-layout-shift"].map((id) => str(obj(audits[id])?.errorMessage)).find(Boolean);
    return { url, finalUrl: str(lhr.finalUrl), strategy, status: "unavailable", error: metricError ? `Lighthouse could not measure performance for this page (${metricError})` : "Lighthouse result has no performance score", errorCode: metricError ? "rejected" : "malformed", field: noField(), lab, diagnostics: [], lcpElement: null, categories, agentic, screenshot, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
  }
  // PSI copies the origin's CrUX data into `loadingExperience` (with
  // `origin_fallback: true`) when the URL itself has no field data — that is a
  // site-wide figure and must be labelled as such, not as this page's own.
  const le = obj(root.loadingExperience);
  const urlLevel = le && le.origin_fallback !== true && (!str(le.id) || str(le.id) === url || str(le.id) === str(lhr.finalUrl) || str(le.id)?.replace(/\/$/, "") === url.replace(/\/$/, "")) ? parseField(root.loadingExperience, "url") : null;
  const field = urlLevel ?? parseField(root.originLoadingExperience, "origin") ?? (le && le.origin_fallback === true ? parseField(root.loadingExperience, "origin") : null) ?? noField();
  const { diagnostics, lcpElement } = parseDiagnostics(lhr);
  return { url, finalUrl: str(lhr.finalUrl), strategy, status: "ok", field, lab, diagnostics, lcpElement, categories, agentic, screenshot, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
}

export type PsiFetchImpl = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<Response>;

export interface PsiOptions {
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: PsiFetchImpl;
  endpoint?: string;
  /** Lighthouse categories to request (default: all of PSI_CATEGORIES). */
  categories?: string[];
}

const DEFAULT_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runPageSpeed(url: string, strategy: Strategy, opts: PsiOptions = {}): Promise<PerfResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 75_000;
  const fetchImpl = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const categories = opts.categories ?? [...PSI_CATEGORIES];
  const q = new URLSearchParams({ url, strategy });
  for (const c of categories) q.append("category", c);
  if (opts.apiKey) q.set("key", opts.apiKey);
  const endpoint = `${opts.endpoint ?? DEFAULT_ENDPOINT}?${q.toString()}`;

  const unavailable = (error: string, errorCode: PerfErrorCode): PerfResult => ({ url, finalUrl: null, strategy, status: "unavailable", error, errorCode, field: noField(), lab: null, diagnostics: [], lcpElement: null, categories: noCategories(), agentic: null, screenshot: null, lighthouseVersion: null, analysisUtc: null, ms: Date.now() - started });

  // The key travels only in the request URL. Nothing below may echo the
  // endpoint, and any message that could carry it (a fetch error quoting the
  // URL) is redacted before it reaches the stored/returned result.
  const redact = (s: string) => (opts.apiKey ? s.split(opts.apiKey).join("[redacted]") : s);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } });
    // Quota first, before touching the body: Google's 429 is not always JSON.
    if (res.status === 429) return unavailable("PageSpeed API quota exceeded (HTTP 429)", "rate_limited");
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      return unavailable(`non-JSON response (HTTP ${res.status})`, "malformed");
    }
    if (!res.ok) {
      const error = obj(obj(body)?.error);
      const msg = redact(str(error?.message) ?? `HTTP ${res.status}`);
      // A PSI backend that predates a category (e.g. agentic-browsing) rejects the whole request: retry once without it.
      if (res.status === 400 && /Invalid value at 'category'/i.test(msg) && categories.length > 1) {
        const remaining = Date.now() - started;
        const kept = categories.filter((c) => !msg.includes(`"${c}"`));
        if (kept.length && kept.length < categories.length) return runPageSpeed(url, strategy, { ...opts, categories: kept, timeoutMs: Math.max(15_000, timeoutMs - remaining) });
      }
      // Daily quota / per-minute limits also arrive as 403 RESOURCE_EXHAUSTED (reason rateLimitExceeded / quotaExceeded / dailyLimitExceeded).
      if (isQuotaError(res.status, error)) return unavailable(`PageSpeed API quota exceeded (HTTP ${res.status}): ${msg}`, "rate_limited");
      // 400/500 from PSI usually means Lighthouse could not load the URL (blocked, DNS, timeout on their side).
      return unavailable(`PageSpeed API error: ${msg}`, res.status === 400 || res.status === 500 ? "rejected" : "http_error");
    }
    return normalizePsiResponse(url, strategy, body, Date.now() - started);
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") return unavailable(`PageSpeed request timed out after ${timeoutMs} ms`, "timeout");
    return unavailable(redact(e.message || "network error"), "network");
  } finally {
    clearTimeout(timer);
  }
}

/** Google API quota signals other than a plain 429. */
function isQuotaError(status: number, error: Json | null): boolean {
  if (status !== 403 && status !== 429) return false;
  if (!error) return false;
  if (str(error.status) === "RESOURCE_EXHAUSTED") return true;
  const reasons = Array.isArray(error.errors) ? (error.errors as unknown[]).map((e) => str(obj(e)?.reason) ?? "") : [];
  if (reasons.some((r) => /quota|rateLimit|dailyLimit|userRateLimit/i.test(r))) return true;
  return /quota|rate limit/i.test(str(error.message) ?? "");
}

/** Thresholds per Google's Core Web Vitals guidance. */
export const THRESHOLDS = {
  lcpMs: { good: 2500, poor: 4000 },
  inpMs: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  fcpMs: { good: 1800, poor: 3000 },
  ttfbMs: { good: 800, poor: 1800 },
  tbtMs: { good: 200, poor: 600 },
  speedIndexMs: { good: 3400, poor: 5800 },
  labScore: { good: 90, poor: 50 },
} as const;

export type Rating = "good" | "needs_improvement" | "poor";

export function rate(value: number | null, t: { good: number; poor: number }, higherIsBetter = false): Rating | null {
  if (value === null) return null;
  if (higherIsBetter) return value >= t.good ? "good" : value >= t.poor ? "needs_improvement" : "poor";
  return value <= t.good ? "good" : value <= t.poor ? "needs_improvement" : "poor";
}

export function cruxToRating(c: CruxCategory | null): Rating | null {
  return c === "FAST" ? "good" : c === "AVERAGE" ? "needs_improvement" : c === "SLOW" ? "poor" : null;
}
