import { fail, pass, skipped, info, type CheckDefinition, type CheckContext, type AffectedPage } from "./types";
import { THRESHOLDS, rate, cruxToRating, type PerfResult, type Diagnostic, type Rating } from "../providers/pagespeed";

/**
 * Performance checks (pillar PERFORMANCE, report section P) over the
 * normalized PageSpeed results. Rules:
 *
 *  - Field (CrUX) data is the truth for LCP/INP/CLS when Google supplies it;
 *    the lab equivalents are then skipped, not double-counted.
 *  - No field data → field checks are SKIPPED with a reason (no penalty).
 *  - Mobile carries the weight; desktop checks are lighter.
 *  - Every FAIL cites the URL, the measured value and the threshold.
 */

const okMobile = (ctx: CheckContext) => ctx.performance.filter((r) => r.strategy === "mobile" && r.status === "ok");
const okDesktop = (ctx: CheckContext) => ctx.performance.filter((r) => r.strategy === "desktop" && r.status === "ok");
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v)} ms`);
const kb = (b: number | null | undefined) => (b == null ? "—" : `${Math.round(b / 1024)} KB`);
const diag = (r: PerfResult, id: string): Diagnostic | undefined => r.diagnostics.find((d) => d.id === id);

/** Build a field-metric check for one rating level. */
function fieldCheck(opts: { id: string; device: "mobile" | "desktop"; metric: "lcp" | "inp" | "cls"; level: "poor" | "needs_improvement"; weight: number; severity: CheckDefinition["severity"]; impact: CheckDefinition["impact"]; label: string; why: string; fix: string; developerFix: string }): CheckDefinition {
  const t = opts.metric === "lcp" ? THRESHOLDS.lcpMs : opts.metric === "inp" ? THRESHOLDS.inpMs : THRESHOLDS.cls;
  const fmt = (v: number) => (opts.metric === "cls" ? v.toFixed(2) : `${Math.round(v)} ms`);
  const expected = opts.metric === "cls" ? `CLS ≤ ${t.good} for 75% of real visits` : `${opts.label} ≤ ${t.good} ms for 75% of real visits`;
  return {
    id: opts.id,
    pillar: "PERFORMANCE", section: "P1", title: `${opts.label} (real users, ${opts.device}) is ${opts.level === "poor" ? "poor" : "below the 'good' threshold"}`,
    severity: opts.severity, weight: opts.weight, impact: opts.impact, effort: 3, confidence: 95, scope: "performance", device: opts.device, evidenceType: "field", metric: opts.label,
    expected, why: opts.why, fix: opts.fix, developerFix: opts.developerFix,
    run: (ctx) => {
      const results = (opts.device === "mobile" ? okMobile(ctx) : okDesktop(ctx)).filter((r) => r.field.available && r.field[opts.metric]);
      if (!results.length) return skipped("no Chrome UX (field) data for these pages — Google only reports it for sites with enough real traffic");
      const affected: AffectedPage[] = [];
      for (const r of results) {
        const m = r.field[opts.metric]!;
        const rating = cruxToRating(m.category);
        if (rating === opts.level) affected.push({ url: r.url, detected: `${fmt(m.percentile)} at the 75th percentile (${r.field.source === "origin" ? "origin-level" : "this URL"})`, expected, evidence: { source: "crux", level: r.field.source, percentile: m.percentile, category: m.category } });
      }
      return fail(affected);
    },
  };
}

/** Lab metric check, used only when the field equivalent is unavailable. */
function labMetricCheck(opts: { id: string; metric: "lcpMs" | "cls" | "tbtMs" | "fcpMs" | "speedIndexMs"; label: string; level: Rating; weight: number; severity: CheckDefinition["severity"]; impact: CheckDefinition["impact"]; fieldEquivalent?: "lcp" | "cls"; why: string; fix: string; developerFix?: string; section?: string }): CheckDefinition {
  const t = THRESHOLDS[opts.metric];
  const fmt = (v: number) => (opts.metric === "cls" ? v.toFixed(2) : `${Math.round(v)} ms`);
  const expected = `${opts.label} ≤ ${opts.metric === "cls" ? t.good : `${t.good} ms`} (Lighthouse, simulated mobile)`;
  return {
    id: opts.id,
    pillar: "PERFORMANCE", section: opts.section ?? "P1", title: `${opts.label} (lab, mobile) is ${opts.level === "poor" ? "poor" : "below the 'good' threshold"}`,
    severity: opts.severity, weight: opts.weight, impact: opts.impact, effort: 3, confidence: 80, scope: "performance", device: "mobile", evidenceType: "lab", metric: opts.label,
    expected, why: opts.why, fix: opts.fix, developerFix: opts.developerFix,
    run: (ctx) => {
      let results = okMobile(ctx).filter((r) => r.lab);
      if (opts.fieldEquivalent) {
        const withoutField = results.filter((r) => !(r.field.available && r.field[opts.fieldEquivalent!]));
        if (!withoutField.length) return skipped("real-user (field) data available for these pages — lab value not scored separately");
        results = withoutField;
      }
      if (!results.length) return skipped("no lab data");
      const affected: AffectedPage[] = [];
      for (const r of results) {
        const v = r.lab![opts.metric];
        if (v === null) continue;
        if (rate(v, t) === opts.level) affected.push({ url: r.url, detected: `${fmt(v)} (Lighthouse)`, expected, evidence: { source: "lighthouse", value: v } });
      }
      return fail(affected);
    },
  };
}

function diagCheck(opts: { id: string; title: string; auditIds: string[]; weight: number; severity: CheckDefinition["severity"]; impact: CheckDefinition["impact"]; effort: CheckDefinition["effort"]; confidence?: number; section?: string; metric?: string; expected: string; why: string; fix: string; developerFix: string; test: (d: Diagnostic[], r: PerfResult) => { fails: boolean; detected: string; evidence?: Record<string, unknown> } }): CheckDefinition {
  return {
    id: opts.id,
    pillar: "PERFORMANCE", section: opts.section ?? "P2", title: opts.title,
    severity: opts.severity, weight: opts.weight, impact: opts.impact, effort: opts.effort, confidence: opts.confidence ?? 85, scope: "performance", device: "mobile", evidenceType: "diagnostic", metric: opts.metric,
    expected: opts.expected, why: opts.why, fix: opts.fix, developerFix: opts.developerFix,
    run: (ctx) => {
      const results = okMobile(ctx);
      if (!results.length) return skipped("no lab data");
      const affected: AffectedPage[] = [];
      let seen = 0;
      for (const r of results) {
        const ds = opts.auditIds.map((id) => diag(r, id)).filter((d): d is Diagnostic => Boolean(d));
        if (!ds.length) continue;
        seen++;
        const v = opts.test(ds, r);
        if (v.fails) affected.push({ url: r.url, detected: v.detected, expected: opts.expected, evidence: { lighthouseAudits: ds.map((d) => ({ id: d.id, score: d.score, displayValue: d.displayValue, savingsMs: d.savingsMs, savingsBytes: d.savingsBytes, items: d.items })), ...(v.evidence ?? {}) } });
      }
      if (!seen) return skipped(`Lighthouse did not report ${opts.auditIds.join("/")} for these pages`);
      return fail(affected);
    },
  };
}

const PERFORMANCE_CHECKS: CheckDefinition[] = [
  {
    id: "perf.psi.unavailable",
    pillar: "PERFORMANCE", section: "P0", title: "PageSpeed could not test some pages",
    severity: "LOW", weight: 0, impact: 1, effort: 1, confidence: 99, siteWide: true, scope: "performance", evidenceType: "lab",
    expected: "PageSpeed Insights returns a result for each representative page",
    why: "Pages PageSpeed could not test are reported as unknown — they neither help nor hurt the score.",
    fix: "No action unless the page is genuinely unreachable; re-run the audit later if Google's API was busy.",
    run: (ctx) => {
      const failed = ctx.performance.filter((r) => r.status !== "ok");
      if (!ctx.performance.length) return skipped("performance stage did not run");
      return failed.length ? info(`${failed.length} of ${ctx.performance.length} PageSpeed runs unavailable`, { runs: failed.map((r) => ({ url: r.url, strategy: r.strategy, error: r.error, code: r.errorCode })) }) : pass();
    },
  },
  {
    id: "perf.field.unavailable",
    pillar: "PERFORMANCE", section: "P0", title: "No real-user (Chrome UX) data for this site",
    severity: "LOW", weight: 0, impact: 1, effort: 1, confidence: 99, siteWide: true, scope: "performance", evidenceType: "field",
    expected: "Google supplies CrUX field data when a site has enough real Chrome traffic",
    why: "Without field data we rely on Lighthouse's simulated (lab) measurements. That's normal for smaller sites and is not a problem in itself.",
    fix: "No action needed.",
    run: (ctx) => {
      const ok = okMobile(ctx);
      if (!ok.length) return skipped("no PageSpeed results");
      return ok.some((r) => r.field.available) ? pass() : info("no CrUX field data for any tested page — Core Web Vitals are assessed from lab data only");
    },
  },

  // ---------- P1 Core Web Vitals — field first ----------
  fieldCheck({ id: "perf.mobile.field.lcp_poor", device: "mobile", metric: "lcp", level: "poor", weight: 14, severity: "HIGH", impact: 5, label: "LCP", why: "Largest Contentful Paint is when the main content becomes visible. Above 4 s on phones, real visitors are waiting on a blank or half-built page — Google treats this as failing Core Web Vitals.", fix: "Make the main image or headline load first: compress and preload the hero image, remove render-blocking scripts, and use a fast host or CDN.", developerFix: "Identify the LCP element (see evidence), serve it as an optimised, correctly-sized image with `fetchpriority=\"high\"` and a `<link rel=preload>`, defer non-critical JS/CSS, and reduce server TTFB." }),
  fieldCheck({ id: "perf.mobile.field.lcp_needs_improvement", device: "mobile", metric: "lcp", level: "needs_improvement", weight: 6, severity: "MEDIUM", impact: 3, label: "LCP", why: "Largest Contentful Paint between 2.5 s and 4 s on phones is 'needs improvement' — the page works, but slower than Google's bar for a good experience.", fix: "Speed up the main image/headline: compress the hero image and trim scripts that load before it.", developerFix: "Preload the LCP image, serve modern formats (WebP/AVIF) at the rendered size, and move non-critical JS behind `defer`." }),
  fieldCheck({ id: "perf.mobile.field.inp_poor", device: "mobile", metric: "inp", level: "poor", weight: 12, severity: "HIGH", impact: 4, label: "INP", why: "Interaction to Next Paint measures how quickly the page reacts to taps. Above 500 ms, buttons and menus feel broken on phones.", fix: "Reduce JavaScript work on the page — heavy widgets, chat bubbles and tag managers are the usual cause.", developerFix: "Profile long tasks; break up main-thread work, defer third-party scripts, and avoid layout thrash in event handlers." }),
  fieldCheck({ id: "perf.mobile.field.inp_needs_improvement", device: "mobile", metric: "inp", level: "needs_improvement", weight: 5, severity: "MEDIUM", impact: 3, label: "INP", why: "Interaction to Next Paint between 200 ms and 500 ms means taps feel slightly laggy on real phones.", fix: "Trim JavaScript that runs on every interaction.", developerFix: "Split long tasks, lazy-load non-critical scripts, and reduce work in input handlers." }),
  fieldCheck({ id: "perf.mobile.field.cls_poor", device: "mobile", metric: "cls", level: "poor", weight: 8, severity: "HIGH", impact: 4, label: "CLS", why: "Cumulative Layout Shift above 0.25 means the page jumps around while loading — visitors tap the wrong thing and lose their place.", fix: "Reserve space for images, ads and embeds so the layout doesn't jump as they load.", developerFix: "Add explicit width/height (or aspect-ratio) to images and iframes, avoid inserting content above existing content, and use `font-display: optional`/size-adjusted fallbacks." }),
  fieldCheck({ id: "perf.mobile.field.cls_needs_improvement", device: "mobile", metric: "cls", level: "needs_improvement", weight: 4, severity: "MEDIUM", impact: 3, label: "CLS", why: "Cumulative Layout Shift between 0.1 and 0.25 — some visible jumping while the page loads.", fix: "Reserve space for late-loading images and embeds.", developerFix: "Set dimensions on media, reserve space for dynamic content, preload web fonts." }),
  fieldCheck({ id: "perf.desktop.field.lcp_poor", device: "desktop", metric: "lcp", level: "poor", weight: 4, severity: "MEDIUM", impact: 3, label: "LCP", why: "Even on desktop, the main content takes over 4 s to appear for real visitors.", fix: "Optimise the hero media and server response.", developerFix: "Preload/optimise the LCP resource; check TTFB and render-blocking CSS." }),

  // ---------- P1 Core Web Vitals — lab fallbacks (only when no field data) ----------
  labMetricCheck({ id: "perf.mobile.lab.lcp_poor", metric: "lcpMs", label: "LCP", level: "poor", weight: 8, severity: "HIGH", impact: 4, fieldEquivalent: "lcp", why: "In Lighthouse's simulated mobile test the main content took over 4 s to appear. This is a lab measurement (throttled connection), not real-user data — but a strong signal on its own.", fix: "Compress and preload the hero image and reduce scripts that load before the main content.", developerFix: "See the LCP element in evidence; preload it, serve responsive modern-format images, defer non-critical JS/CSS." }),
  labMetricCheck({ id: "perf.mobile.lab.lcp_needs_improvement", metric: "lcpMs", label: "LCP", level: "needs_improvement", weight: 4, severity: "MEDIUM", impact: 3, fieldEquivalent: "lcp", why: "Simulated mobile LCP between 2.5 s and 4 s — acceptable but not good.", fix: "Optimise the hero image and defer non-critical scripts.", developerFix: "Preload the LCP image and trim render-blocking resources." }),
  labMetricCheck({ id: "perf.mobile.lab.cls_poor", metric: "cls", label: "CLS", level: "poor", weight: 5, severity: "MEDIUM", impact: 3, fieldEquivalent: "cls", why: "Lighthouse observed heavy layout shifting (CLS > 0.25) while the page loaded on a simulated phone.", fix: "Reserve space for images and embeds.", developerFix: "Set width/height on media, avoid injecting content above the fold." }),
  labMetricCheck({ id: "perf.mobile.lab.cls_needs_improvement", metric: "cls", label: "CLS", level: "needs_improvement", weight: 2, severity: "LOW", impact: 2, fieldEquivalent: "cls", why: "Some layout shifting (CLS 0.1–0.25) in the simulated mobile load.", fix: "Reserve space for late-loading elements.", developerFix: "Add dimensions to images/iframes; preload fonts." }),
  labMetricCheck({ id: "perf.mobile.lab.tbt_high", metric: "tbtMs", label: "Total Blocking Time", level: "poor", weight: 6, severity: "MEDIUM", impact: 4, why: "Total Blocking Time over 600 ms means JavaScript kept the phone busy long enough that taps would be ignored — the lab proxy for a poor INP.", fix: "Reduce the JavaScript that runs at page load.", developerFix: "Remove unused JS, defer third-party tags, split long tasks (see main-thread breakdown in evidence)." }),
  labMetricCheck({ id: "perf.mobile.lab.tbt_moderate", metric: "tbtMs", label: "Total Blocking Time", level: "needs_improvement", weight: 3, severity: "LOW", impact: 2, why: "Total Blocking Time of 200–600 ms — noticeable JavaScript work at load on a phone.", fix: "Trim JavaScript that isn't needed for the first view.", developerFix: "Defer non-critical scripts; audit third-party tags." }),
  labMetricCheck({ id: "perf.mobile.lab.fcp_slow", metric: "fcpMs", label: "First Contentful Paint", level: "poor", weight: 3, severity: "LOW", impact: 2, why: "Nothing at all appeared for over 3 s in the simulated mobile load.", fix: "Reduce render-blocking CSS/JS and server response time.", developerFix: "Inline critical CSS, defer the rest, and improve TTFB." }),
  labMetricCheck({ id: "perf.mobile.lab.speed_index_slow", metric: "speedIndexMs", label: "Speed Index", level: "poor", weight: 3, severity: "LOW", impact: 2, section: "P1", why: "Speed Index over 5.8 s — the visible parts of the page filled in slowly.", fix: "Prioritise above-the-fold content and defer the rest.", developerFix: "Reduce render-blocking resources and large above-the-fold media." }),

  // ---------- P1 Lighthouse performance score ----------
  {
    id: "perf.mobile.lab.score_poor",
    pillar: "PERFORMANCE", section: "P1", title: "Lighthouse mobile performance score is poor (< 50)",
    severity: "HIGH", weight: 15, impact: 5, effort: 4, confidence: 85, scope: "performance", device: "mobile", evidenceType: "lab", metric: "performance_score",
    expected: "Lighthouse performance score ≥ 90 on mobile",
    why: "Lighthouse's mobile score summarises how the page loads on a mid-range phone over a slow connection — the conditions most {customers} are actually on. Below 50 is the red zone.",
    fix: "Treat page speed as a project: images, scripts, caching and hosting together (the findings below list the specific culprits).",
    developerFix: "Work the Lighthouse opportunities in evidence order (largest savings first); re-test after each change.",
    run: (ctx) => fail(okMobile(ctx).filter((r) => r.lab && r.lab.performanceScore !== null && r.lab.performanceScore < THRESHOLDS.labScore.poor).map((r) => ({ url: r.url, detected: `${r.lab!.performanceScore}/100 (Lighthouse, mobile)`, expected: "≥ 90", evidence: { source: "lighthouse", score: r.lab!.performanceScore } }))),
  },
  {
    id: "perf.mobile.lab.score_needs_improvement",
    pillar: "PERFORMANCE", section: "P1", title: "Lighthouse mobile performance score needs improvement (50–89)",
    severity: "MEDIUM", weight: 7, impact: 3, effort: 3, confidence: 85, scope: "performance", device: "mobile", evidenceType: "lab", metric: "performance_score",
    expected: "Lighthouse performance score ≥ 90 on mobile",
    why: "The page loads acceptably on phones but not fast — there is measurable room to improve.",
    fix: "Apply the specific opportunities listed in the other performance findings.",
    developerFix: "Work the Lighthouse opportunities in evidence order.",
    run: (ctx) => fail(okMobile(ctx).filter((r) => r.lab && r.lab.performanceScore !== null && r.lab.performanceScore >= THRESHOLDS.labScore.poor && r.lab.performanceScore < THRESHOLDS.labScore.good).map((r) => ({ url: r.url, detected: `${r.lab!.performanceScore}/100 (Lighthouse, mobile)`, expected: "≥ 90", evidence: { source: "lighthouse", score: r.lab!.performanceScore } }))),
  },
  {
    id: "perf.desktop.lab.score_poor",
    pillar: "PERFORMANCE", section: "P1", title: "Lighthouse desktop performance score is poor (< 50)",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 4, confidence: 85, scope: "performance", device: "desktop", evidenceType: "lab", metric: "performance_score",
    expected: "Lighthouse performance score ≥ 90 on desktop",
    why: "Slow even on a fast connection and a laptop — the problem is the page itself, not the network.",
    fix: "Reduce page weight and JavaScript.",
    developerFix: "Work the Lighthouse opportunities in evidence order.",
    run: (ctx) => fail(okDesktop(ctx).filter((r) => r.lab && r.lab.performanceScore !== null && r.lab.performanceScore < THRESHOLDS.labScore.poor).map((r) => ({ url: r.url, detected: `${r.lab!.performanceScore}/100 (Lighthouse, desktop)`, expected: "≥ 90", evidence: { source: "lighthouse", score: r.lab!.performanceScore } }))),
  },
  {
    id: "perf.desktop.lab.score_needs_improvement",
    pillar: "PERFORMANCE", section: "P1", title: "Lighthouse desktop performance score needs improvement (50–89)",
    severity: "LOW", weight: 3, impact: 2, effort: 3, confidence: 85, scope: "performance", device: "desktop", evidenceType: "lab", metric: "performance_score",
    expected: "Lighthouse performance score ≥ 90 on desktop",
    why: "Desktop loading is acceptable but not fast.",
    fix: "Apply the mobile fixes — they help desktop too.",
    developerFix: "Work the Lighthouse opportunities in evidence order.",
    run: (ctx) => fail(okDesktop(ctx).filter((r) => r.lab && r.lab.performanceScore !== null && r.lab.performanceScore >= THRESHOLDS.labScore.poor && r.lab.performanceScore < THRESHOLDS.labScore.good).map((r) => ({ url: r.url, detected: `${r.lab!.performanceScore}/100 (Lighthouse, desktop)`, expected: "≥ 90", evidence: { source: "lighthouse", score: r.lab!.performanceScore } }))),
  },

  // ---------- P2 Diagnostics / opportunities (mobile) ----------
  diagCheck({ id: "perf.diag.render_blocking", title: "Render-blocking scripts and stylesheets", auditIds: ["render-blocking-resources", "render-blocking-insight"], weight: 5, severity: "MEDIUM", impact: 4, effort: 2, metric: "render_blocking_ms", expected: "No render-blocking resources delaying first paint by ≥ 300 ms", why: "Scripts and stylesheets in the <head> stop the browser from drawing anything until they've downloaded — on a phone that's a blank screen.", fix: "Load non-essential scripts and styles after the page is visible.", developerFix: "Add `defer`/`async` to scripts, inline critical CSS and load the rest asynchronously (`media=\"print\" onload=…` or `preload`).", test: (d) => { const saved = Math.max(...d.map((x) => x.savingsMs ?? 0)); const n = d[0].totals.count; return { fails: saved >= 300, detected: `${ms(saved)} of blocking (${n} resource${n === 1 ? "" : "s"})` }; } }),
  diagCheck({ id: "perf.diag.unused_js", title: "Large amounts of unused JavaScript", auditIds: ["unused-javascript", "legacy-javascript", "legacy-javascript-insight", "duplicated-javascript-insight"], weight: 4, severity: "MEDIUM", impact: 3, effort: 3, metric: "unused_js_bytes", expected: "< 100 KB of unused JavaScript on load", why: "JavaScript that is downloaded and parsed but never used costs phone battery, data and time before the page is interactive.", fix: "Remove plugins/widgets you don't use and load the rest only where needed.", developerFix: "Code-split, tree-shake, drop legacy polyfills, and lazy-load below-the-fold scripts (see the file list in evidence).", test: (d) => { const b = d.reduce((s, x) => s + (x.savingsBytes ?? 0), 0); return { fails: b >= 100 * 1024, detected: `${kb(b)} unused` }; } }),
  diagCheck({ id: "perf.diag.unused_css", title: "Large amounts of unused CSS", auditIds: ["unused-css-rules", "unminified-css"], weight: 2, severity: "LOW", impact: 2, effort: 3, metric: "unused_css_bytes", expected: "< 50 KB of unused CSS", why: "Stylesheets full of rules the page never uses still have to be downloaded and parsed before anything renders.", fix: "Ask your developer to trim the stylesheet (page builders and themes are the usual cause).", developerFix: "Purge unused CSS per template, minify, and split per-page styles.", test: (d) => { const b = d.reduce((s, x) => s + (x.savingsBytes ?? 0), 0); return { fails: b >= 50 * 1024, detected: `${kb(b)} unused` }; } }),
  diagCheck({ id: "perf.diag.images", title: "Images are oversized, unoptimised or not lazy-loaded", auditIds: ["uses-optimized-images", "uses-responsive-images", "modern-image-formats", "offscreen-images", "image-delivery-insight"], weight: 5, severity: "MEDIUM", impact: 4, effort: 2, metric: "image_savings_bytes", expected: "< 100 KB of potential image savings", why: "Images are almost always the biggest thing a phone has to download. Serving them compressed, correctly sized and lazy-loaded is the cheapest large speed win there is.", fix: "Compress images, upload them at the size they're displayed, and let images below the fold load lazily.", developerFix: "Serve WebP/AVIF with `srcset`/`sizes`, add `loading=\"lazy\"` below the fold, and compress the files listed in evidence.", test: (d) => { const b = d.reduce((s, x) => s + (x.savingsBytes ?? 0), 0); return { fails: b >= 100 * 1024, detected: `${kb(b)} potential savings across ${d.map((x) => x.id.replace(/^uses-/, "").replace(/-insight$/, "")).join(", ")}` }; } }),
  diagCheck({ id: "perf.diag.lcp_resource", title: "The main (LCP) image is lazy-loaded or not prioritised", auditIds: ["lcp-lazy-loaded", "prioritize-lcp-image", "lcp-discovery-insight"], weight: 4, severity: "MEDIUM", impact: 4, effort: 1, metric: "lcp_resource", expected: "The LCP image is discoverable early, not lazy-loaded, and preloaded", why: "The hero image is the single element that decides when the page 'looks loaded'. Lazy-loading it, or letting it queue behind other files, delays that moment for every visitor.", fix: "Make sure the first big image on the page loads immediately, not lazily.", developerFix: "Remove `loading=\"lazy\"` from the LCP image, add `fetchpriority=\"high\"` and `<link rel=\"preload\" as=\"image\">` for it.", test: (d) => {
    const lazy = d.find((x) => x.id === "lcp-lazy-loaded"); const prio = d.find((x) => x.id === "prioritize-lcp-image");
    // LH13: one checklist — priorityHinted / requestDiscoverable / eagerlyLoaded (absent when the LCP element is not an image).
    const cl = d.find((x) => x.id === "lcp-discovery-insight")?.checklist ?? null;
    const problems = [
      lazy && lazy.score !== null && lazy.score < 1 ? "LCP image is lazy-loaded" : null,
      prio?.savingsMs ? `${ms(prio.savingsMs)} saveable by prioritising the LCP image` : null,
      cl?.eagerlyLoaded === false ? "LCP image is lazy-loaded" : null,
      cl?.priorityHinted === false ? "LCP image has no fetchpriority=\"high\"" : null,
      cl?.requestDiscoverable === false ? "LCP image is not discoverable from the HTML (no preload / injected by script or CSS)" : null,
    ].filter(Boolean) as string[];
    const fails = (lazy?.score !== null && lazy?.score !== undefined && lazy.score < 1) || (prio?.savingsMs ?? 0) >= 200 || (cl ? Object.values(cl).some((v) => v === false) : false);
    return { fails, detected: [...new Set(problems)].join("; ") || "ok", evidence: cl ? { checklist: cl } : undefined };
  } }),
  diagCheck({ id: "perf.diag.caching", title: "Static assets served without long-lived caching", auditIds: ["uses-long-cache-ttl", "cache-insight"], weight: 3, severity: "LOW", impact: 2, effort: 1, metric: "cache_wasted_bytes", expected: "Images, CSS and JS cached for ≥ 1 year", why: "Returning visitors and every page after the first re-download files the browser could have kept. Fixing cache headers is a server setting, not a redesign.", fix: "Ask your host/developer to enable long cache lifetimes for images, scripts and styles.", developerFix: "Send `Cache-Control: public, max-age=31536000, immutable` for versioned static assets (see files in evidence).", test: (d) => { const b = d[0].savingsBytes ?? d[0].totals.wastedBytes; return { fails: (d[0].score ?? 1) < 1 && b >= 100 * 1024, detected: `${kb(b)} of assets with short/no cache lifetime (${d[0].totals.count} file${d[0].totals.count === 1 ? "" : "s"})` }; } }),
  diagCheck({ id: "perf.diag.compression", title: "Text assets served without compression", auditIds: ["uses-text-compression", "document-latency-insight"], weight: 3, severity: "MEDIUM", impact: 3, effort: 1, metric: "compression_savings_bytes", expected: "HTML, CSS and JS served with gzip or Brotli", why: "Without compression, text files are 3–5× larger than they need to be. It's a one-line server change.", fix: "Ask your host to enable gzip/Brotli compression.", developerFix: "Enable Brotli/gzip at the web server or CDN for text/html, text/css, application/javascript, application/json.", test: (d) => {
    // LH13 folds compression into the document-latency checklist (main document only); the legacy audit covers every text asset.
    const cl = d.find((x) => x.id === "document-latency-insight")?.checklist ?? null;
    const legacy = d.find((x) => x.id === "uses-text-compression");
    if (cl && legacy === undefined) return { fails: cl.usesCompression === false, detected: cl.usesCompression === false ? `main document served uncompressed${d[0].savingsBytes ? ` (${kb(d[0].savingsBytes)} saveable)` : ""}` : "compressed", evidence: { checklist: cl } };
    return { fails: (legacy?.savingsBytes ?? 0) >= 30 * 1024, detected: `${kb(legacy?.savingsBytes ?? null)} saveable with compression` };
  } }),
  diagCheck({ id: "perf.diag.third_party", title: "Third-party scripts block the main thread", auditIds: ["third-party-summary", "third-parties-insight"], weight: 4, severity: "MEDIUM", impact: 3, effort: 2, metric: "third_party_blocking_ms", expected: "Third-party code blocks the main thread for < 250 ms", why: "Chat widgets, tag managers, ad pixels and social embeds run on every page load and you don't control their code. Each one costs real time on a phone.", fix: "Remove third-party scripts you no longer use and load the rest after the page is interactive.", developerFix: "Defer/lazy-load third-party tags (facade for chat/video embeds), consolidate tag managers; see the per-vendor blocking time in evidence.", test: (d) => {
    const n = d[0].totals.count;
    const parties = `${n} third part${n === 1 ? "y" : "ies"}`;
    // Legacy audit reports blocking time per entity; the LH13 insight reports main-thread time only (a looser measure → higher bar).
    const blocking = d[0].totals.wastedMs || (d[0].numericValue ?? 0);
    if (blocking > 0 || d[0].id === "third-party-summary") return { fails: blocking >= 250, detected: `${ms(blocking)} main-thread blocking from ${parties}` };
    const mainThread = d[0].totals.ms;
    return { fails: mainThread >= 1000, detected: `${ms(mainThread)} main-thread time from ${parties}` };
  } }),
  diagCheck({ id: "perf.diag.main_thread", title: "Excessive JavaScript execution / main-thread work", auditIds: ["mainthread-work-breakdown", "bootup-time", "long-tasks"], weight: 4, severity: "MEDIUM", impact: 3, effort: 4, metric: "main_thread_ms", expected: "Main-thread work < 4 s and JS execution < 2 s in the simulated mobile load", why: "The phone's processor is busy running scripts instead of drawing the page and responding to taps.", fix: "Reduce the number and size of scripts on the page.", developerFix: "Profile with the main-thread breakdown in evidence; defer non-critical JS, remove heavy libraries, split long tasks.", test: (d) => { const mt = d.find((x) => x.id === "mainthread-work-breakdown")?.numericValue ?? 0; const boot = d.find((x) => x.id === "bootup-time")?.numericValue ?? 0; return { fails: mt >= 4000 || boot >= 2000, detected: `main thread ${ms(mt)}, JS execution ${ms(boot)}` }; } }),
  diagCheck({ id: "perf.diag.dom_size", title: "Very large DOM", auditIds: ["dom-size", "dom-size-insight"], weight: 2, severity: "LOW", impact: 2, effort: 4, metric: "dom_elements", expected: "< 1,500 DOM elements", why: "A huge page structure (page builders often produce this) slows style calculation and layout on every interaction.", fix: "Simplify page layouts; avoid deeply nested builder sections.", developerFix: "Reduce wrapper elements, virtualise long lists, and avoid rendering hidden content.", test: (d) => ({ fails: (d[0].numericValue ?? 0) > 1500, detected: `${Math.round(d[0].numericValue ?? 0)} elements` }) }),
  diagCheck({ id: "perf.diag.server_response", title: "Slow server response time (Lighthouse)", auditIds: ["server-response-time"], weight: 3, severity: "MEDIUM", impact: 3, effort: 3, confidence: 75, section: "P2", metric: "server_response_ms", expected: "Initial server response < 800 ms", why: "Lighthouse also measured the server taking too long to start responding — everything else waits on it.", fix: "Enable page caching or move to faster hosting.", developerFix: "Add full-page caching / CDN, optimise slow queries, and check hosting resources.", test: (d) => ({ fails: (d[0].numericValue ?? 0) > 800, detected: ms(d[0].numericValue) }) }),
  diagCheck({ id: "perf.diag.fonts", title: "Web fonts block text rendering", auditIds: ["font-display", "font-display-insight"], weight: 2, severity: "LOW", impact: 2, effort: 1, metric: "font_display", expected: "All web fonts use font-display: swap/optional", why: "While a custom font downloads, text can stay invisible — the page looks blank longer than it needs to.", fix: "Ask your developer to let text show in a fallback font while the custom font loads.", developerFix: "Add `font-display: swap` (or `optional`) to @font-face rules and preload the primary font file.", test: (d) => { const n = d[0].totals.count; return { fails: n > 0 && ((d[0].score ?? 1) < 0.5 || (d[0].savingsMs ?? 0) >= 100), detected: `${n} font file${n === 1 ? "" : "s"} without font-display${d[0].savingsMs ? ` (${ms(d[0].savingsMs)} of invisible text)` : ""}` }; } }),
  diagCheck({ id: "perf.diag.payload", title: "Very large total page weight", auditIds: ["total-byte-weight"], weight: 3, severity: "LOW", impact: 3, effort: 3, metric: "total_bytes", expected: "Total transfer < 3 MB", why: "Everything the page downloads adds up. Over 3 MB is slow on mobile data and expensive for visitors on capped plans.", fix: "Compress images and remove unused scripts and fonts.", developerFix: "See the largest requests in evidence; compress images, remove unused bundles, subset fonts.", test: (d) => ({ fails: (d[0].numericValue ?? 0) > 3 * 1024 * 1024, detected: kb(d[0].numericValue) }) }),
  diagCheck({ id: "perf.diag.redirects", title: "Page URL goes through redirects before loading", auditIds: ["redirects"], weight: 2, severity: "LOW", impact: 2, effort: 1, metric: "redirect_ms", expected: "No redirects on the page URL", why: "Each redirect before the page loads adds a round trip on mobile networks.", fix: "Link directly to the final URL.", developerFix: "Update links and canonical URLs to the final destination; collapse redirect chains.", test: (d) => ({ fails: (d[0].savingsMs ?? 0) > 0, detected: `${ms(d[0].savingsMs)} lost to redirects` }) }),
];

export default PERFORMANCE_CHECKS;

