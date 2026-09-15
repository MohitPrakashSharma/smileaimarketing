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
  /** Lighthouse score 0–1 (null for informative audits) */
  score: number | null;
  displayValue: string | null;
  numericValue: number | null;
  numericUnit: string | null;
  savingsMs: number | null;
  savingsBytes: number | null;
  items: DiagnosticItem[]; // capped
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
  lighthouseVersion: string | null;
  analysisUtc: string | null;
  ms: number;
}

/** Lighthouse audits we normalize (diagnostics/opportunities). Everything else is dropped. */
export const DIAGNOSTIC_IDS = [
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

function parseDiagnostics(lhr: Json): { diagnostics: Diagnostic[]; lcpElement: PerfResult["lcpElement"] } {
  const audits = obj(lhr.audits) ?? {};
  const out: Diagnostic[] = [];
  let lcpElement: PerfResult["lcpElement"] = null;
  for (const id of DIAGNOSTIC_IDS) {
    const a = obj(audits[id]);
    if (!a) continue;
    const details = obj(a.details);
    const rawItems = Array.isArray(details?.items) ? (details!.items as unknown[]) : [];
    const items: DiagnosticItem[] = rawItems.slice(0, MAX_ITEMS).map((it) => {
      const o = obj(it) ?? {};
      const entity = obj(o.entity);
      const node = obj(o.node);
      return {
        url: str(o.url) ?? str(entity?.text) ?? undefined,
        label: str(o.label) ?? str(o.groupLabel) ?? str(node?.snippet)?.slice(0, 160) ?? str(entity?.text) ?? undefined,
        bytes: num(o.totalBytes) ?? num(o.transferSize) ?? undefined,
        wastedBytes: num(o.wastedBytes) ?? undefined,
        wastedMs: num(o.wastedMs) ?? num(o.blockingTime) ?? undefined,
        ms: num(o.duration) ?? num(o.total) ?? num(o.mainThreadTime) ?? undefined,
      };
    });
    if (id === "largest-contentful-paint-element" && rawItems.length) {
      const first = obj(rawItems[0]);
      const inner = first && Array.isArray(first.items) ? obj((first.items as unknown[])[0]) : first;
      const node = inner ? obj(inner.node) : null;
      if (node?.snippet) lcpElement = { snippet: String(node.snippet).slice(0, 300), url: str(inner?.url) ?? null };
    }
    out.push({
      id,
      title: str(a.title) ?? id,
      score: num(a.score),
      displayValue: str(a.displayValue),
      numericValue: num(a.numericValue),
      numericUnit: str(a.numericUnit),
      savingsMs: num(details?.overallSavingsMs),
      savingsBytes: num(details?.overallSavingsBytes),
      items,
    });
  }
  return { diagnostics: out, lcpElement };
}

/** Pure normalizer — exported for tests and for re-normalizing stored data. */
export function normalizePsiResponse(url: string, strategy: Strategy, body: unknown, ms: number): PerfResult {
  const root = obj(body);
  const lhr = root ? obj(root.lighthouseResult) : null;
  if (!root || !lhr) {
    return { url, finalUrl: null, strategy, status: "unavailable", error: "response has no lighthouseResult", errorCode: "malformed", field: noField(), lab: null, diagnostics: [], lcpElement: null, lighthouseVersion: null, analysisUtc: null, ms };
  }
  const runtimeError = obj(lhr.runtimeError);
  if (runtimeError && str(runtimeError.code) && runtimeError.code !== "NO_ERROR") {
    return { url, finalUrl: str(lhr.finalUrl), strategy, status: "unavailable", error: `Lighthouse runtime error ${runtimeError.code}: ${str(runtimeError.message) ?? ""}`.trim(), errorCode: "rejected", field: noField(), lab: null, diagnostics: [], lcpElement: null, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
  }
  const lab = parseLab(lhr);
  if (!lab || lab.performanceScore === null) {
    return { url, finalUrl: str(lhr.finalUrl), strategy, status: "unavailable", error: "Lighthouse result has no performance score", errorCode: "malformed", field: noField(), lab, diagnostics: [], lcpElement: null, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
  }
  const field = parseField(root.loadingExperience, "url") ?? parseField(root.originLoadingExperience, "origin") ?? noField();
  const { diagnostics, lcpElement } = parseDiagnostics(lhr);
  return { url, finalUrl: str(lhr.finalUrl), strategy, status: "ok", field, lab, diagnostics, lcpElement, lighthouseVersion: str(lhr.lighthouseVersion), analysisUtc: str(root.analysisUTCTimestamp), ms };
}

export type PsiFetchImpl = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<Response>;

export interface PsiOptions {
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: PsiFetchImpl;
  endpoint?: string;
}

const DEFAULT_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runPageSpeed(url: string, strategy: Strategy, opts: PsiOptions = {}): Promise<PerfResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const fetchImpl = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const q = new URLSearchParams({ url, strategy, category: "performance" });
  if (opts.apiKey) q.set("key", opts.apiKey);
  const endpoint = `${opts.endpoint ?? DEFAULT_ENDPOINT}?${q.toString()}`;

  const unavailable = (error: string, errorCode: PerfErrorCode): PerfResult => ({ url, finalUrl: null, strategy, status: "unavailable", error, errorCode, field: noField(), lab: null, diagnostics: [], lcpElement: null, lighthouseVersion: null, analysisUtc: null, ms: Date.now() - started });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      return unavailable(`non-JSON response (HTTP ${res.status})`, "malformed");
    }
    if (res.status === 429) return unavailable("PageSpeed API quota exceeded (HTTP 429)", "rate_limited");
    if (!res.ok) {
      const msg = str(obj(obj(body)?.error)?.message) ?? `HTTP ${res.status}`;
      // 400/500 from PSI usually means Lighthouse could not load the URL (blocked, DNS, timeout on their side).
      return unavailable(`PageSpeed API error: ${msg}`, res.status === 400 || res.status === 500 ? "rejected" : "http_error");
    }
    return normalizePsiResponse(url, strategy, body, Date.now() - started);
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") return unavailable(`PageSpeed request timed out after ${timeoutMs} ms`, "timeout");
    return unavailable(e.message || "network error", "network");
  } finally {
    clearTimeout(timer);
  }
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
