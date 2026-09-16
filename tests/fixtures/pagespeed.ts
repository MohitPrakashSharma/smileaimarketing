import type { PsiFetchImpl } from "@/lib/audit/providers/pagespeed";

/**
 * Builders for PageSpeed Insights v5 responses. Shapes mirror the real API
 * closely enough for the normalizer (loadingExperience / originLoadingExperience
 * / lighthouseResult.categories / lighthouseResult.audits).
 */

export interface PsiFixtureOptions {
  score?: number; // 0–1
  lcpMs?: number;
  fcpMs?: number;
  cls?: number;
  tbtMs?: number;
  siMs?: number;
  ttiMs?: number | null;
  field?: null | { lcp?: [number, string]; inp?: [number, string]; cls?: [number, string]; fcp?: [number, string]; ttfb?: [number, string]; overall?: string; source?: "url" | "origin" };
  audits?: Record<string, unknown>;
  omitAudits?: string[];
  finalUrl?: string;
  runtimeError?: { code: string; message: string };
}

const fieldMetrics = (f: NonNullable<PsiFixtureOptions["field"]>) => {
  const m: Record<string, unknown> = {};
  if (f.lcp) m.LARGEST_CONTENTFUL_PAINT_MS = { percentile: f.lcp[0], category: f.lcp[1] };
  if (f.inp) m.INTERACTION_TO_NEXT_PAINT = { percentile: f.inp[0], category: f.inp[1] };
  if (f.cls) m.CUMULATIVE_LAYOUT_SHIFT_SCORE = { percentile: f.cls[0], category: f.cls[1] }; // ×100 as PSI does
  if (f.fcp) m.FIRST_CONTENTFUL_PAINT_MS = { percentile: f.fcp[0], category: f.fcp[1] };
  if (f.ttfb) m.EXPERIMENTAL_TIME_TO_FIRST_BYTE = { percentile: f.ttfb[0], category: f.ttfb[1] };
  return m;
};

export function psiResponse(url: string, o: PsiFixtureOptions = {}): Record<string, unknown> {
  const { score = 0.92, lcpMs = 1800, fcpMs = 1200, cls = 0.02, tbtMs = 80, siMs = 2200, ttiMs = 2600 } = o;
  const audits: Record<string, unknown> = {
    "largest-contentful-paint": { numericValue: lcpMs, score: 0.9 },
    "first-contentful-paint": { numericValue: fcpMs, score: 0.9 },
    "cumulative-layout-shift": { numericValue: cls, score: 0.95 },
    "total-blocking-time": { numericValue: tbtMs, score: 0.95 },
    "speed-index": { numericValue: siMs, score: 0.9 },
    ...(ttiMs === null ? {} : { interactive: { numericValue: ttiMs, score: 0.9 } }),
    "render-blocking-resources": { title: "Eliminate render-blocking resources", score: 1, details: { overallSavingsMs: 0, items: [] } },
    "unused-javascript": { title: "Reduce unused JavaScript", score: 1, details: { overallSavingsBytes: 20000, items: [] } },
    "uses-long-cache-ttl": { title: "Serve static assets with an efficient cache policy", score: 1, details: { items: [] } },
    "third-party-summary": { title: "Minimize third-party usage", score: 1, details: { items: [] } },
    "dom-size": { title: "Avoid an excessive DOM size", numericValue: 600, score: 1, details: { items: [] } },
    "server-response-time": { title: "Initial server response time was short", numericValue: 300, score: 1, details: { items: [] } },
    "largest-contentful-paint-element": { title: "Largest Contentful Paint element", score: null, details: { items: [{ items: [{ node: { snippet: '<img src="/hero.jpg" alt="hero">' } }] }] } },
    ...(o.audits ?? {}),
  };
  for (const id of o.omitAudits ?? []) delete audits[id];
  const field = o.field === null || o.field === undefined ? null : { metrics: fieldMetrics(o.field), overall_category: o.field.overall ?? "FAST" };
  const res: Record<string, unknown> = {
    id: url,
    analysisUTCTimestamp: "2026-09-15T12:00:00.000Z",
    lighthouseResult: {
      finalUrl: o.finalUrl ?? url,
      lighthouseVersion: "12.0.0",
      categories: { performance: { score } },
      audits,
      ...(o.runtimeError ? { runtimeError: o.runtimeError } : {}),
    },
  };
  if (field) {
    if (o.field?.source === "origin") res.originLoadingExperience = field;
    else res.loadingExperience = field;
  }
  return res;
}

export const POOR_MOBILE: PsiFixtureOptions = {
  score: 0.31,
  lcpMs: 6200,
  fcpMs: 3400,
  cls: 0.31,
  tbtMs: 1450,
  siMs: 7800,
  field: { lcp: [4800, "SLOW"], inp: [620, "SLOW"], cls: [28, "SLOW"], overall: "SLOW" },
  audits: {
    "render-blocking-resources": { title: "Eliminate render-blocking resources", score: 0.2, details: { overallSavingsMs: 1250, items: [{ url: "https://x.test/app.css", wastedMs: 800, totalBytes: 90000 }, { url: "https://x.test/vendor.js", wastedMs: 450, totalBytes: 240000 }] } },
    "unused-javascript": { title: "Reduce unused JavaScript", score: 0.1, details: { overallSavingsBytes: 480000, items: [{ url: "https://x.test/vendor.js", wastedBytes: 300000 }, { url: "https://x.test/app.js", wastedBytes: 180000 }] } },
    "unused-css-rules": { title: "Reduce unused CSS", score: 0.3, details: { overallSavingsBytes: 90000, items: [] } },
    "uses-optimized-images": { title: "Efficiently encode images", score: 0.2, details: { overallSavingsBytes: 900000, items: [{ url: "https://x.test/hero.jpg", wastedBytes: 700000, totalBytes: 1200000 }] } },
    "modern-image-formats": { title: "Serve images in next-gen formats", score: 0.2, details: { overallSavingsBytes: 650000, items: [] } },
    "offscreen-images": { title: "Defer offscreen images", score: 0.4, details: { overallSavingsBytes: 200000, items: [] } },
    "lcp-lazy-loaded": { title: "Largest Contentful Paint image was lazily loaded", score: 0, details: { items: [{ node: { snippet: '<img loading="lazy" src="/hero.jpg">' } }] } },
    "prioritize-lcp-image": { title: "Preload Largest Contentful Paint image", score: 0, details: { overallSavingsMs: 900, items: [] } },
    "uses-long-cache-ttl": { title: "Serve static assets with an efficient cache policy", score: 0.1, details: { overallSavingsBytes: 1500000, items: [{ url: "https://x.test/hero.jpg", wastedBytes: 1200000, cacheLifetimeMs: 0 }, { url: "https://x.test/vendor.js", wastedBytes: 300000 }] } },
    "uses-text-compression": { title: "Enable text compression", score: 0, details: { overallSavingsBytes: 210000, items: [] } },
    "third-party-summary": { title: "Reduce the impact of third-party code", score: 0, details: { items: [{ entity: { text: "Chat Widget Inc" }, blockingTime: 620, mainThreadTime: 900 }, { entity: { text: "Tag Manager" }, blockingTime: 210, mainThreadTime: 400 }] } },
    "dom-size": { title: "Avoid an excessive DOM size", numericValue: 3400, score: 0, details: { items: [] } },
    "mainthread-work-breakdown": { title: "Minimize main-thread work", numericValue: 6100, score: 0.1, details: { items: [{ groupLabel: "Script Evaluation", duration: 3900 }] } },
    "bootup-time": { title: "Reduce JavaScript execution time", numericValue: 3100, score: 0.2, details: { items: [] } },
    "server-response-time": { title: "Reduce initial server response time", numericValue: 1400, score: 0.4, details: { items: [] } },
    "font-display": { title: "Ensure text remains visible during webfont load", score: 0, details: { items: [{ url: "https://x.test/font.woff2", wastedMs: 300 }] } },
    "total-byte-weight": { title: "Avoid enormous network payloads", numericValue: 5400000, score: 0.1, details: { items: [] } },
  },
};

export const NO_CRUX: PsiFixtureOptions = { score: 0.71, lcpMs: 3100, cls: 0.05, tbtMs: 350, field: null };

/**
 * Lighthouse 13 (PSI since 2026) shapes: the legacy opportunity audits are gone
 * and replaced by `*-insight` audits with `metricSavings`, `debugData`,
 * `checklist` and `list` details. Modelled on live responses (LH 13.4.1).
 */
export const POOR_MOBILE_LH13: PsiFixtureOptions = {
  score: 0.31,
  lcpMs: 6200,
  fcpMs: 3400,
  cls: 0.31,
  tbtMs: 1450,
  siMs: 7800,
  field: null,
  omitAudits: ["render-blocking-resources", "uses-long-cache-ttl", "third-party-summary", "dom-size", "largest-contentful-paint-element"],
  audits: {
    "render-blocking-insight": { title: "Render blocking requests", score: 0, scoreDisplayMode: "metricSavings", displayValue: "Est savings of 2,620 ms", metricSavings: { LCP: 2600, FCP: 2600 }, details: { type: "table", items: [{ url: "https://x.test/post-11.css", totalBytes: 0, wastedMs: 165 }, { url: "https://x.test/frontend.min.css", totalBytes: 7481, wastedMs: 821 }] } },
    "cache-insight": { title: "Use efficient cache lifetimes", score: 0.5, scoreDisplayMode: "metricSavings", displayValue: "Est savings of 1,464 KiB", metricSavings: { LCP: 0, FCP: 0 }, details: { type: "table", items: Array.from({ length: 9 }, (_, i) => ({ url: `https://x.test/asset-${i}.js`, cacheLifetimeMs: 0, totalBytes: 170000, wastedBytes: 166600 })), debugData: { type: "debugdata", wastedBytes: 1499400 } } },
    "document-latency-insight": { title: "Document request latency", score: 0, scoreDisplayMode: "metricSavings", displayValue: "Est savings of 1,460 ms", metricSavings: { LCP: 1450, FCP: 1450 }, details: { type: "checklist", items: { serverResponseIsFast: { value: false, label: "Server responded slowly (observed 1400 ms)" }, noRedirects: { value: false, label: "Had redirects (1 redirects, +1458 ms)" }, usesCompression: { value: false, label: "No compression applied" } }, debugData: { type: "debugdata", serverResponseTime: 1400, redirectDuration: 1458, uncompressedResponseBytes: 210000, wastedBytes: 160000 } } },
    "third-parties-insight": { title: "3rd parties", score: 1, scoreDisplayMode: "informative", details: { type: "table", isEntityGrouped: true, items: [{ entity: "Chat Widget Inc", transferSize: 900000, mainThreadTime: 1100, subItems: { type: "subitems", items: [{ url: "https://chat.test/w.js", transferSize: 900000, mainThreadTime: 1100 }] } }, { entity: "Tag Manager", transferSize: 171796, mainThreadTime: 199.5 }] } },
    "dom-size-insight": { title: "Optimize DOM size", score: 1, scoreDisplayMode: "informative", numericValue: 3400, numericUnit: "element", metricSavings: { INP: 0 }, details: { type: "table", items: [{ statistic: "Total elements", value: { type: "numeric", value: 3400, granularity: 1 } }, { statistic: "DOM depth", node: { type: "node", snippet: "<span>" }, value: { type: "numeric", value: 25 } }], debugData: { type: "debugdata", totalElements: 3400 } } },
    "font-display-insight": { title: "Font display", score: 0, scoreDisplayMode: "metricSavings", displayValue: "Est savings of 170 ms", metricSavings: { FCP: 150, INP: 0 }, details: { type: "table", skipSumming: ["wastedMs"], items: [{ url: "https://x.test/eicons.woff", wastedMs: 170 }, { url: "https://x.test/fa.woff2", wastedMs: 160 }] } },
    "image-delivery-insight": { title: "Improve image delivery", score: 0, scoreDisplayMode: "metricSavings", displayValue: "Est savings of 141 KiB", metricSavings: { LCP: 450, FCP: 0 }, details: { type: "table", items: [{ url: "https://x.test/hero.jpg", node: { type: "node", snippet: '<img class="swiper-slide-image" src="https://x.test/hero.jpg">' }, totalBytes: 50652, wastedBytes: 39259, subItems: { type: "subitems", items: [{ wastedBytes: 39259, reason: "Increasing the image compression factor could improve this image's download size." }] } }, { url: "https://x.test/team.png", totalBytes: 130000, wastedBytes: 105297 }], debugData: { type: "debugdata", wastedBytes: 144556 } } },
    "lcp-breakdown-insight": { title: "LCP breakdown", score: 0, scoreDisplayMode: "numeric", metricSavings: { LCP: 0 }, details: { type: "list", items: [{ type: "table", items: [{ label: "Time to first byte", subpart: "timeToFirstByte", duration: 24.188 }, { label: "Element render delay", subpart: "elementRenderDelay", duration: 4300.979 }] }, { type: "node", nodeLabel: "Hero", snippet: '<img class="hero" src="https://x.test/hero.jpg">' }] } },
    "lcp-discovery-insight": { title: "LCP request discovery", score: 0, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 900 }, details: { type: "list", items: [{ type: "node", snippet: '<img class="hero" src="https://x.test/hero.jpg">' }, { type: "checklist", items: { priorityHinted: { value: false, label: "fetchpriority=high should be applied" }, requestDiscoverable: { value: true, label: "Request is discoverable in initial document" }, eagerlyLoaded: { value: false, label: "lazy load not applied" } } }] } },
    "legacy-javascript-insight": { title: "Legacy JavaScript", score: 0.5, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 0, FCP: 0 }, details: { type: "table", items: [{ url: "https://x.test/polyfills.js", wastedBytes: 120000 }] } },
    "server-response-time": { title: "Initial server response time was short", score: 1, numericValue: 24, details: { type: "opportunity", overallSavingsMs: 0, items: [] } },
    "unused-javascript": { title: "Reduce unused JavaScript", score: 0.5, details: { type: "opportunity", overallSavingsBytes: 1092110, items: [{ url: "https://x.test/vendor.js", totalBytes: 800000, wastedBytes: 600000 }] } },
    "mainthread-work-breakdown": { title: "Minimize main-thread work", numericValue: 6100, score: 0, details: { type: "table", items: [{ groupLabel: "Script Evaluation", duration: 3900 }] } },
    "total-byte-weight": { title: "Avoid enormous network payloads", numericValue: 5400000, score: 0.1, details: { type: "table", items: [] } },
  },
};

/** Route-level mock: URL (+strategy) → response/behaviour. */
export type PsiRoute = { body?: unknown; status?: number; hang?: boolean; text?: string };

export function makePsiFetch(routes: Record<string, PsiRoute | ((strategy: string) => PsiRoute)>, log: string[] = []): { fetchImpl: PsiFetchImpl; log: string[] } {
  const fetchImpl: PsiFetchImpl = async (endpoint, init) => {
    const u = new URL(endpoint);
    const target = u.searchParams.get("url") ?? "";
    const strategy = u.searchParams.get("strategy") ?? "mobile";
    log.push(`${strategy} ${target}`);
    const entry = routes[target] ?? routes["*"];
    const route = typeof entry === "function" ? entry(strategy) : entry;
    if (!route) return new Response(JSON.stringify({ error: { message: "no fixture" } }), { status: 500, headers: { "content-type": "application/json" } });
    if (route.hang) return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    if (route.text !== undefined) return new Response(route.text, { status: route.status ?? 200, headers: { "content-type": "text/html" } });
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return { fetchImpl, log };
}
