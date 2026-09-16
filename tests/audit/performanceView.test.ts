import { describe, it, expect } from "vitest";
import { normalizePsiResponse } from "@/lib/audit/providers/pagespeed";
import { buildPerformanceView, metricsFor, fmtMs, pathOf, type PerfRow } from "@/lib/audit/view/performanceView";
import { gaugeStatus } from "@/components/ui/ScoreGauge";
import { psiResponse, NO_CRUX, POOR_MOBILE } from "../fixtures/pagespeed";
import LH13_REAL from "../fixtures/psi-lighthouse13-mobile.json";
import LH13_ALL_CATS from "../fixtures/psi-lighthouse13-all-categories.json";

/** Shape a normalized provider result the way the report API stores/returns it. */
function row(url: string, strategy: "mobile" | "desktop", body: unknown, pageType = "home"): PerfRow {
  const r = normalizePsiResponse(url, strategy, body, 1);
  return { url, strategy, pageType, selectionReason: "test", status: r.status, error: r.error ?? null, field: r.field, lab: r.lab, lcpElement: r.lcpElement, diagnostics: r.diagnostics, categories: r.categories, agentic: r.agentic, lighthouseVersion: r.lighthouseVersion, analysisUtc: r.analysisUtc };
}
const failed = (url: string, strategy: "mobile" | "desktop"): PerfRow => ({ url, strategy, pageType: "home", selectionReason: "test", status: "unavailable", error: "PageSpeed API quota exceeded (HTTP 429)", field: null, lab: null, lcpElement: null, diagnostics: [] });

const HOME = "https://healthy.test/";
const CONTACT = "https://healthy.test/contact";

describe("performance view-model", () => {
  it("offers the device toggle only when both devices were actually measured", () => {
    const both = buildPerformanceView([row(HOME, "mobile", psiResponse(HOME, NO_CRUX)), row(HOME, "desktop", psiResponse(HOME, { score: 0.95, field: null }))]);
    expect(both.canToggle).toBe(true);
    expect(both.pages).toHaveLength(1);
    expect(both.pages[0].mobile?.lab?.performanceScore).toBe(71);
    expect(both.pages[0].desktop?.lab?.performanceScore).toBe(95);

    const mobileOnly = buildPerformanceView([row(HOME, "mobile", psiResponse(HOME, NO_CRUX)), failed(HOME, "desktop")]);
    expect(mobileOnly.canToggle).toBe(false);
    expect(mobileOnly.hasDesktop).toBe(false);
    expect(mobileOnly.pages[0].desktop).toBeNull();
    expect(mobileOnly.failedRuns).toEqual([{ url: HOME, strategy: "desktop", error: "PageSpeed API quota exceeded (HTTP 429)" }]);
  });

  it("orders the homepage first and reports an honest empty state when nothing succeeded", () => {
    const v = buildPerformanceView([row(CONTACT, "mobile", psiResponse(CONTACT, NO_CRUX), "conversion"), row(HOME, "mobile", psiResponse(HOME, NO_CRUX), "home")]);
    expect(v.pages.map((p) => p.path)).toEqual(["Homepage", "/contact"]);

    const none = buildPerformanceView([failed(HOME, "mobile"), failed(HOME, "desktop")]);
    expect(none.okRuns).toBe(0);
    expect(none.pages).toEqual([]);
    expect(none.totalRuns).toBe(2);
    expect(buildPerformanceView([]).okRuns).toBe(0);
  });

  it("prefers real-user (field) data, keeps the lab value as context, and never invents INP", () => {
    const r = row(HOME, "mobile", psiResponse(HOME, POOR_MOBILE));
    const m = Object.fromEntries(metricsFor(r).map((x) => [x.key, x]));
    expect(m.lcp).toMatchObject({ source: "field", value: 4800, display: "4.8 s", rating: "poor", labDisplay: "6.2 s", fieldLevel: "url" });
    expect(m.inp).toMatchObject({ source: "field", value: 620, rating: "poor" });
    expect(m.cls).toMatchObject({ source: "field", value: 0.28, display: "0.28", rating: "poor", labDisplay: "0.31" });
    expect(m.fcp).toMatchObject({ source: "lab", rating: "poor" }); // no field FCP in the fixture → lab
    expect(m.tbt).toMatchObject({ source: "lab", value: 1450, display: "1.5 s", rating: "poor" });
    expect(m.si).toMatchObject({ source: "lab", rating: "poor" });
    expect(m.ttfb).toBeUndefined(); // field-only and not reported → tile omitted, not faked

    const lab = row(HOME, "mobile", psiResponse(HOME, NO_CRUX));
    const l = Object.fromEntries(metricsFor(lab).map((x) => [x.key, x]));
    expect(l.lcp).toMatchObject({ source: "lab", value: 3100, rating: "needs_improvement", labDisplay: null });
    expect(l.inp).toMatchObject({ source: null, value: null, display: "—", rating: null });
    expect(l.inp.unavailableReason).toMatch(/real-visitor/);
    expect(metricsFor(lab).map((x) => x.key)).toEqual(["lcp", "inp", "cls", "fcp", "si", "tbt"]);
  });

  it("renders a real Lighthouse 13 response (no CrUX) as lab-only tiles with the LCP element", () => {
    const r = row("https://www.torontoplumber.com/", "mobile", LH13_REAL);
    const keys = metricsFor(r);
    expect(keys.every((m) => m.source === "lab" || m.value === null)).toBe(true);
    expect(keys.find((m) => m.key === "lcp")!.value).toBeGreaterThan(0);
    expect(r.lcpElement?.snippet).toContain("<h2");
    expect(buildPerformanceView([r]).anyFieldData).toBe(false);
  });

  it("formats values and paths for humans; gauge bands follow Google's", () => {
    expect(fmtMs(680)).toBe("680 ms");
    expect(fmtMs(3843)).toBe("3.8 s");
    expect(fmtMs(10091)).toBe("10 s");
    expect(pathOf("https://x.test/")).toBe("Homepage");
    expect(pathOf("https://x.test/services/")).toBe("/services");
    expect(pathOf("not a url")).toBe("not a url");
    expect(gaugeStatus(90)).toBe("healthy");
    expect(gaugeStatus(89)).toBe("opportunity");
    expect(gaugeStatus(49)).toBe("attention");
  });
});

describe("Google website checks view + finding humaniser", () => {
  it("maps stored category rows to the five checks and marks missing ones honestly", async () => {
    const { googleChecksFor } = await import("@/lib/audit/view/performanceView");
    const r = row("https://www.torontoplumber.com/", "desktop", LH13_ALL_CATS);
    const checks = googleChecksFor({ ...r, categories: r.categories, agentic: r.agentic } as PerfRow);
    expect(checks.map((c) => c.key)).toEqual(["performance", "accessibility", "bestPractices", "seo", "agentic"]);
    expect(checks[0]).toMatchObject({ kind: "score", available: true, score: 86 });
    expect(checks[1]).toMatchObject({ available: true, score: 98, passed: 25, applicable: 26 });
    expect(checks[3]).toMatchObject({ available: true, score: 92 });
    expect(checks[4]).toMatchObject({ kind: "checklist", available: true, passed: 2, applicable: 2, score: null });
    // an audit stored before categories were collected
    const old = row("https://healthy.test/", "mobile", psiResponse("https://healthy.test/", NO_CRUX));
    const legacy = googleChecksFor({ ...old, categories: null, agentic: null } as PerfRow);
    expect(legacy[0]).toMatchObject({ available: true, score: 71 });
    for (const c of legacy.slice(1)) expect(c).toMatchObject({ available: false, score: null });
    expect(legacy[1].unavailableReason).toMatch(/Not collected/);
    // performance unavailable but categories present (NO_LCP case)
    const partial: PerfRow = { ...old, status: "unavailable", error: "Lighthouse could not measure performance for this page (NO_LCP)", lab: null, categories: r.categories, agentic: r.agentic };
    const p = googleChecksFor(partial);
    expect(p[0]).toMatchObject({ available: false, score: null });
    expect(p[0].unavailableReason).toMatch(/NO_LCP/);
    expect(p[1]).toMatchObject({ available: true, score: 98 });
    expect(googleChecksFor(null).every((c) => !c.available)).toBe(true);
  });

  it("turns measured values into plain sentences and keeps the technical text out of the default view", async () => {
    const { humanizeDetail, measuredSummary, primaryAction, whyInBrief } = await import("@/lib/audit/view/findingView");
    const lcp = { checkId: "perf.mobile.lab.lcp_poor", title: "LCP (lab, mobile) is poor", detected: "10091 ms (Lighthouse)", affectedPageCount: 2, device: "mobile", urls: [{ url: "https://x.test/contact", detected: "3843 ms (Lighthouse)" }, { url: "https://x.test/", detected: "10091 ms (Lighthouse)" }] };
    expect(humanizeDetail(lcp)).toBe("Main content takes 10 s to appear on mobile (Google's target is 2.5 s)"); // homepage preferred
    expect(humanizeDetail({ checkId: "perf.mobile.lab.tbt_high", title: "", detected: "678 ms (Lighthouse)", affectedPageCount: 1, device: "mobile", urls: [] })).toBe("Scripts freeze the page for 678 ms during load on mobile (target 200 ms)");
    expect(humanizeDetail({ checkId: "perf.desktop.lab.score_needs_improvement", title: "", detected: "84/100 (Lighthouse, desktop)", affectedPageCount: 1, device: "desktop", urls: [] })).toBe("Google PageSpeed score 84/100 on desktop");
    expect(humanizeDetail({ checkId: "perf.diag.unused_js", title: "", detected: "312 KB unused", affectedPageCount: 3, device: "mobile", urls: [] })).toBe("312 KB unused on mobile (3 pages)");
    expect(humanizeDetail({ checkId: "content.h1.missing", title: "", detected: "0 H1", affectedPageCount: 11, urls: [] })).toBe("0 H1 on 11 pages");
    expect(humanizeDetail({ checkId: "content.thin_page", title: "", detected: "2 page(s)", affectedPageCount: 2, urls: [] })).toBeNull();
    const f = { title: "t", affectedPageCount: 2, detectedValue: "2 page(s)", developerDetails: [{ checkId: "content.thin_page", title: "", detected: "2 page(s)", affectedPageCount: 2, urls: [] }], recommendedFix: "Expand thin pages.\n• Add 300+ words.", whyItMatters: "Pages with little text rarely rank. Google rewards depth.", device: null };
    expect(measuredSummary(f, 12)).toBe("Affects 2 pages of the 12 we crawled");
    expect(primaryAction(f)).toBe("Expand thin pages.");
    expect(whyInBrief(f)).toBe("Pages with little text rarely rank.");
    expect(measuredSummary({ ...f, developerDetails: [lcp, lcp] }, 12)).toMatch(/^Main content takes 10 s .* · \+1 related check$/);
  });
});
