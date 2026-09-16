# SEO Audit Redesign — Architecture Proposal

Status: decisions final (§0); Phase 0 + Phase 1 implemented on branch `feat/universal-audit-auto-city`. Written 2026-09-15.

---

## 0. Final decisions (2026-09-15)

1. **HTML parsing — `node-html-parser`** is the primary parser. No browser rendering in the crawl loop. The crawler exposes a `RenderFallback` hook (`lib/audit/core/render.ts`): a page that looks JS-only (`tech.render.js_only`) is *flagged*; a later phase may plug in a renderer for those pages only.
2. **Progressive self-serve experience.** The audit runs asynchronously and writes `Audit.progressJson` at every stage: `detect → sitemap → crawl (X/Y) → technical → content → search → finalize → done`. Verified findings are persisted after each pillar's checks run and are readable through `GET /api/audit/progress/[auditId]` and the report endpoint while the audit is `RUNNING`. **Pillar and overall scores are only written once the crawl stage has finished** (all discovered pages fetched or the page/time budget reached) and all pillar checks have run; until then the API returns `scores: null` and `scoresLocked: false`. The wizard advances to the preview as soon as the crawl stage completes.
3. **Atomic checks vs. client-facing findings.** ~85 checks run internally and each writes an `AuditCheckResult` row (status, pages affected, weight, penalty, sample evidence) — this is the score ledger. Client-facing `AuditFinding` rows are **grouped**: `lib/audit/findings/groups.ts` rolls related checks into one finding (e.g. *"Page titles and descriptions need work"* ← `content.title.*`, `content.meta.*`, `content.og.missing`) and additionally builds per-page findings for key pages with ≥ 3 content problems (*"Service page optimization is incomplete: /services"*). Every grouped finding keeps `checkIdsJson` and `developerDetailsJson` (per underlying check: detected/expected values, exact URLs, fix instructions) so a developer can drill down.
4. **AI boundary (hard rule).** Pipeline order is fixed: crawler/API evidence → deterministic checks → findings & scoring → AI explanation. AI may explain why a verified finding matters, summarise, personalise wording, and draft title/meta copy labelled *suggestion*. AI may not invent issues, set or change severity, alter any score, or reference evidence that was not collected. Nothing in `lib/audit/core`, `lib/audit/checks`, `lib/audit/findings`, `lib/audit/scoring.ts` or `lib/audit/priority.ts` may import `lib/openai.ts`. (AI narrative itself is Phase 3 — not implemented yet.)
5. **Feature flag.** `CRAWL_V2=true` selects the new engine (`Audit.engine = CRAWL_V2`); otherwise the legacy engine runs. Both engines are invoked through the single entry point `lib/audit/engine.ts#runAudit`, from the worker (`audit-queue`) or inline (`AUDIT_EXECUTION=inline`, the default outside production so local dev works without the worker).
6. **Scope now:** Phase 0 + Phase 1 only. No PageSpeed, DataForSEO organic, Safe Browsing, AI narrative, or full report UI redesign. The existing report UI is kept and fed a compatibility payload, plus one added "Detailed findings" section so V1 and V2 can be compared.

---

## 0.1 Phase 0 + 1 — what shipped (2026-09-15)

**Pipeline (both engines):** `inbound-trigger` / `unlock-lead` / admin re-run / campaign discovery → `lib/audit/engine.ts#dispatchAudit` → `runAudit` (status lock: only PENDING/FAILED can start) → `engines/legacy.ts` **or** `engines/v2.ts`. `unlock-lead` no longer analyses anything; the worker's `analysis-queue` and the new `audit-queue` both call `runAudit`.

**v2 modules**

```
lib/audit/core/      fetch.ts (SSRF guard, redirects, size cap, cache) · url.ts · robots.ts · sitemap.ts
                     parse.ts (node-html-parser + regex salvage) · crawler.ts (BFS, budgets, politeness, 429 back-off,
                     link/host/image probes) · render.ts (RenderFallback hook, unused) · types.ts
lib/audit/checks/    types.ts · technical.ts (37 checks) · content.ts (25 checks) · index.ts (registry, context, runner)
lib/audit/findings/  groups.ts (family groups + per-page roll-ups + developer details)
lib/audit/scoring.ts · lib/audit/priority.ts · lib/audit/progress.ts · lib/audit/report.ts (v2 payload + legacy shape)
lib/audit/engine.ts · lib/audit/engines/{legacy,v2}.ts
app/api/audit/progress/[auditId]/route.ts   progressive polling (no scores)
tests/audit/*.test.ts + tests/fixtures/sites.ts   59 offline tests, 5 fixture sites
prisma/migrations/20260915092623_audit_v2_foundation
```

**Validation round (2026-09-15)** — six live sites, 71 check-level results verified by hand against live HTML/headers (harness: `npx tsx scripts/validate-audit.ts <url> <out.json> [city] [category]`).

| Site | Type | Crawled | Result (after fixes) |
|---|---|---|---|
| torontoplumber.com | small local service, WordPress/Elementor, Cloudflare | 32/32 | 73 overall · 10 findings, all verified |
| mrrooter.ca | national franchise, 2,468-URL sitemap, 1 MB pages | 40 (budget) | 85 overall · 7 findings |
| terrafirmalandscaping.ca | WordPress block theme, 5 pages | 5/5 | 74 overall · 6 findings |
| cal.com | Next.js/Framer, 2 MB HTML, sitemap index | 34 (bytes budget) | 84 overall · 11 findings |
| arngren.net | deliberately weak, http-only | 40 (1st run); site went offline mid-round | 11 → then `null` (down, verified with curl) |
| g2.com | DataDome + Cloudflare 403 | 0 | `null` — "blocked: HTTP 403 · datadome", one INFO, no findings |

*False positives found and fixed (all generic):* www-inconsistency judged against the typed host instead of the host the seed lands on; site-wide MEDIUM checks escalating to HIGH because their pageShare is trivially 1; "JS-only rendering" on terse but server-rendered pages (gallery, contact form); "no about page" when the page is `/get-to-know-us`; image `alt` miscounted on Framer/Next sites (regex not quote-aware, inline-SVG data URIs, bare `alt` attribute); tap-to-call/form expectations applied to a SaaS; TTFB reported as total download time; a body-read timeout reported as a 5xx; unreachable robots.txt/sitemap reported as "missing"; template placeholder hrefs (`/itemDataObject.url`) reported as broken links; `.html` extension flagged as URL hygiene; 47 near-identical per-page findings on a flat site.

*False negatives:* about-page detection (fixed by widening the path patterns). Known gap — `tech.duplicate.url_variants` only fires when duplicate URLs lack a canonical; two URL variants that each self-canonicalise (e.g. `/a` and `/a?x=1` both declaring themselves canonical with identical bodies) are caught by `content.duplicate_body` but not attributed to canonical misconfiguration.

*UNKNOWN / INCONCLUSIVE rule (now enforced in code):* a check may only FAIL on evidence we actually collected. HTTP 429/503-with-Retry-After, our own timeouts, connect failures on robots.txt/sitemap, bot-protection (403/401/vendor headers/challenge markup) and pages we could not fetch produce `INFO`/`SKIPPED` rows with a reason — never a finding. `INFO` rows do not count as measured, so a pillar with no PASS/FAIL results scores `null`; a crawl that yields no HTML page scores `null` for every pillar (`measurable=false`); a blocked site yields one INFO finding and `null` scores. A genuinely down site (DNS failure, connection refused, homepage 4xx/5xx) is a CRITICAL finding with `null` scores — that is a real outage, not our inability to measure.

*Remaining known limitations:* no JS rendering (client-rendered pages are flagged, not analysed); sitemap capped at 2,000 URLs and crawl at 40 pages (link-first, so the navigational core is covered); post-crawl probes time-boxed at 25 s (image sizes / some link checks may be SKIPPED on slow hosts); sitemap-only pages have unknown depth and `orphan_in_sitemap`/`depth_gt3` are skipped when the budget is hit; TTFB is measured from our server region until Phase 2 field data; national/franchise sites receive local-business expectations (NAP, city in title) whenever a city is supplied; `tech.render.js_only` remains a heuristic (confidence 60).

**Operating it**

- Enable: `CRAWL_V2=true` in `.env`. `AUDIT_EXECUTION=inline` (default outside production) runs audits in the web process via `after()`; `=queue` needs `npm run worker`.
- Budgets: `AUDIT_MAX_PAGES` (40), `AUDIT_MAX_PAGES_ADMIN` (150), `AUDIT_MAX_DURATION_MS` (90000). Probes are time-boxed to 25 s.
- Compare engines on one business: `POST /api/admin/audits/run` with `{ businessId, engine: "LEGACY_V1" | "CRAWL_V2", newAudit: true }` → returns `reportUrl`. Each run is a separate `Audit` row; the report page renders whichever engine produced it.
- Score ledger: `Audit.scoreBreakdownJson` and `AuditCheckResult` rows (`penalty = weight × min(1, pageShare × 2)`).
- Not in Phase 1: Search/Local pillars (`null`, "not measured"), PageSpeed/DataForSEO/Safe Browsing, AI summary (deterministic template only), report UI redesign, v2 PDF layout, R2 storage.

---

## 0.2 Phase 2A — performance + AI content intelligence (implemented 2026-09-15)

**Pipeline stays evidence-first:** crawl → deterministic checks → findings/scores → *(new)* PageSpeed measurements → deterministic performance checks → *(new)* OpenAI interpretation of per-page evidence → OPPORTUNITY findings (unscored). AI never decides whether a technical issue exists, never touches severity or scores, and every AI string passes a claim scrubber before it can reach a report.

**Performance (Google PageSpeed Insights v5, free).** `lib/audit/providers/pagespeed.ts` normalises each URL × strategy into `field` (CrUX: LCP/INP/CLS/FCP/TTFB percentiles + categories, url- or origin-level) and `lab` (Lighthouse score, LCP, FCP, CLS, TBT, Speed Index, TTI when present) plus 27 capped diagnostics and the LCP element. Mobile and desktop are separate rows (`AuditPerformance`). Representative pages (`lib/audit/pages/select.ts`): home → best service → location → conversion → content, deduped by body hash, 4 pages self-serve / 5 admin, mobile queued before desktop, stage time-boxed. 35 checks in `lib/audit/checks/performance.ts` form a dedicated **PERFORMANCE pillar** (weight 0.20; Technical 0.30, Content 0.25, Search 0.15, Local 0.10 — renormalised, so Phase-1 audits score identically). Field data wins over lab for LCP/CLS (lab equivalents SKIPPED with a reason); no CrUX → field checks SKIPPED, no penalty; API timeout/429/rejection/malformed → `status: unavailable`, INFO row, pillar `null`, overall unaffected. Deductions: weight × min(1, pageShare × 2) over *tested* pages, e.g. mobile Lighthouse < 50 → 15, field LCP poor → 14, INP poor → 12, CLS poor → 8, TBT > 600 ms → 6, render-blocking ≥ 300 ms → 5, images ≥ 100 KB savings → 5, desktop score < 50 → 6. Grouped findings: "Mobile page load performance is poor", "Large hero media is delaying the page's main content", "JavaScript is blocking the main thread", "The page layout shifts while loading", "Static assets are not cached or compressed effectively", "Third-party scripts are adding significant execution cost", "Desktop performance needs improvement"; each keeps Lighthouse audit ids and field/lab provenance in developer details. Key: `PAGESPEED_API_KEY` → else `GOOGLE_PLACES_API_KEY` → else keyless (the anonymous pool's daily quota is unreliable; enable "PageSpeed Insights API" on the Google project).

**AI content intelligence (OpenAI, existing `OPENAI_API_KEY`/`OPENAI_MODEL`).** Selection: same representative logic plus issue-heavy pages, 5 pages self-serve / 8 admin, CMS artefacts (attachments, archives, header/footer templates) and legal/utility pages excluded, duplicates skipped. Evidence (`lib/audit/ai/evidence.ts`): business + page facts (title, meta, canonical, H1, H2/H3 outline, cleaned main text ≤ 1,800 words with 8-word-shingle boilerplate removal, out/in links with redirect notes, schema, CTA/phone/form, FAQ, trust pages, duplicates, the page's deterministic issues). Prompt (`lib/audit/ai/prompt.ts`, version `2a.2`) forbids rankings, volumes, traffic, backlinks, authority, conversion rates, penalties, Search Console, CWV numbers and indexation claims. Output: strict Zod schema (`lib/audit/ai/schema.ts`), unknown keys stripped, sizes trimmed, then sentence-level scrubbing of unsupported claims (recorded in `scrubbedJson`). Client (`lib/audit/ai/openaiClient.ts`): `response_format: json_object`, `max_completion_tokens` 4,000 (doubled on `finish_reason=length`, ceiling 12k), one retry on invalid output / 429 / 5xx, parameter negotiation on "Unsupported parameter/value" (never a model swap), exact API message on a rejected model, auth/model errors halt the stage. Each page → at most one `OPPORTUNITY` finding (`source: openai`, `evidenceKind: AI_INFERRED_OPPORTUNITY | AI_RECOMMENDATION`, confidence capped at 70, impact/effort from a fixed table). Results persisted in `AuditAiPageAnalysis` (evidence + result + scrubbed + tokens); reopening a report never calls OpenAI or PageSpeed again.

**Provenance:** `AuditFinding.evidenceKind` (`MEASURED` for PageSpeed, `DETERMINISTIC_FINDING` for crawler, `AI_*` for OpenAI), `source`, `device`, `metric`. Progress stages gained `performance` ("Testing site performance") and `ai` ("Content intelligence").

**Migration `20260915134023_audit_v2_performance_ai`:** enum `EvidenceKind`; `FindingPillar` += `PERFORMANCE`; `Audit.performanceScore`; `AuditFinding.{evidenceKind, source, device, metric}` (nullable); tables `AuditPerformance`, `AuditAiPageAnalysis` (cascade on audit delete). Additive only.

**Live validation (2026-09-15).** Full audits via the API on torontoplumber.com (small local, WordPress), mrrooter.ca (franchise, 40-page crawl) and cal.com (Next.js/Framer). AI stage: 12 page analyses completed with the configured reasoning model, 0 sentences removed by the claim scrubber; recommendations were checked line-by-line against the stored evidence packets for four pages and every observation traced to the crawled text. Issues found and fixed generically during the round: the model rejected `max_tokens` (now `max_completion_tokens` + parameter negotiation, never a model swap) and was starved by a 1,400-token cap (now 4,000, doubled on truncation); a prompt/schema list-cap mismatch discarded whole pages (sizes are now trimmed, not rejected); attachment/archive pages and a footer-linked `/font` page were selected as "service" (artefact exclusion + service-strength ranking); words glued across inline tags ("fontInteroperable"); nav strips survived sentence-level boilerplate removal (now 8-word shingles); a literal `<!DOCTYPE html>` leaked into evidence; a SaaS was asked for a service area (city omitted for online-only industries); JS-animated "0" counters were reported as errors (prompt caveat). Failure paths exercised live: PageSpeed 429 and 403 → pillar `null`, INFO row, audit completed; model parameter rejection → exact API message stored.

**Live validation of PageSpeed (2026-09-16, Lighthouse 13.4.1).** Two full v2 audits ran end-to-end against the local database with a dedicated `PAGESPEED_API_KEY` (web.dev — CrUX field data present; torontoplumber.com — no CrUX): 8/8 and 4/4 runs `ok`, field/lab extraction, `AuditPerformance` rows, the ledger, grouped findings with `MEASURED`/`pagespeed`/device provenance, the report payload and the report UI all verified. Findings from that round, fixed generically:

- **Lighthouse 13 renamed the opportunity audits.** PSI now serves LH 13, where `render-blocking-resources`, `uses-long-cache-ttl`, `uses-text-compression`, `third-party-summary`, `dom-size`, `font-display`, the four image audits, `lcp-lazy-loaded`, `prioritize-lcp-image` and `largest-contentful-paint-element` no longer exist; their successors are `*-insight` audits (`render-blocking-insight`, `cache-insight`, `document-latency-insight` (checklist: compression / redirects / server response), `third-parties-insight`, `dom-size-insight`, `font-display-insight`, `image-delivery-insight`, `lcp-discovery-insight` (checklist: `priorityHinted` / `requestDiscoverable` / `eagerlyLoaded`), `lcp-breakdown-insight` (carries the LCP node)). Insights report savings via `metricSavings` (ms) and `debugData.wastedBytes` rather than `overallSavingsMs/Bytes`. The normalizer and every `perf.diag.*` check now accept both generations (`tests/fixtures/psi-lighthouse13-mobile.json` is a trimmed real response); before this fix 8 of the 14 diagnostic checks could never fire and the LCP element was never captured. The LH13 `third-parties-insight` has no blocking time, only main-thread time — the check uses ≥ 1,000 ms main-thread when blocking time is absent (≥ 250 ms blocking when present).
- Quota signals: a non-JSON 429 and a 403 `RESOURCE_EXHAUSTED` / `rateLimitExceeded` are both `rate_limited`; the API key is redacted from any error text before it is stored; credential-looking query params (`key`, `token`, …) in the audited site's own third-party resource URLs are redacted before diagnostics are persisted.
- Performance findings are prioritised against the *tested* pages (`performanceDenominator`), not the whole crawl — previously "poor on 1 of 1 tested pages" ranked like "poor on 1 of 6 crawled".
- The performance stage is isolated in the engine (any unexpected error → pillar `null`, ledger and findings rolled back to the deterministic set, audit continues); `performanceScore` is reset on re-run; an unparsable `analysisUTCTimestamp` no longer fails the insert.
- Report: unmeasured pillar cards render "Not measured" instead of the legacy 50/100 placeholder and are excluded from "Strongest / Biggest opportunity".

**Google website checks + report redesign (2026-09-16).** PSI is now asked for all five Lighthouse categories in one call (`category=performance&…&agentic-browsing`; ~30–40 s per run vs ~15 s, stage budget raised to 210 s / 75 s per call; a backend that rejects a category name is retried without it). `AuditPerformance.categoriesJson` stores Accessibility / Best Practices / SEO as `{ score 0–100, passed, applicable, failed[≤12] }` (weighted audits only); `agenticJson` stores Google's Lighthouse-13 **Agentic Browsing** category in its own format — binary/not-applicable audits, presented as "passed X of Y applicable checks", never as a percentage (Google marks the category as under development). Migration `20260916113506_audit_performance_lighthouse_categories` is additive (two nullable JSONB columns); rows written before it render as "Not collected — re-run to include it". A `NO_LCP`-style metric error leaves Lighthouse's performance category unscored: the run is `unavailable` for performance but its other categories are kept. None of the four extra categories feed our scoring — the SEO audit remains the product; Google's SEO check is labelled "Google basics only" and explicitly contrasted with our audit in its detail panel.

*Score labelling (the "22 vs 63" question).* Our **Performance pillar** is a deduction ledger over every tested page × device (e.g. 18 failing checks → 78 points off → 22); Google's **PageSpeed score** is Lighthouse's composite for one page on one device (63 = that site's homepage on desktop; its mobile homepage was 44). Both are correct and now labelled as such wherever they appear (page, device and test date shown; nothing averaged across runs). Design note for a later decision: the pillar penalises the Lighthouse score *and* the lab metrics that compose it (LCP/FCP/SI/TBT), so it runs systematically lower than Google's own number — intentional per §9.2 but worth revisiting.

*Report structure (v2 engine only; V1 reports unchanged):* 1 Audit overview (headline, gauge, summary, three stats) → 2 Google website checks (five tiles, one expandable detail: grouped Core Web Vitals with real-user vs lab labels, LCP element, "what's slowing it down" links) → 3 Findings by area (compact pillar rows) → 4 Action plan (top 5 by priority: measured / why / do this) → 5 Detailed findings (two-level cards: plain measured result, one-line why, action; expanded evidence per check with source badge, URLs, device, developer notes). Consultation forms collapsed into one tabbed sticky sidebar. `lib/audit/view/findingView.ts` turns stored check values into plain sentences ("Main content takes 13 s to appear on mobile (Google's target is 2.5 s)"); the headline no longer claims lost customers.

**Customer PDF (2026-09-16).** `lib/audit/pdf/v2Pdf.ts` renders the full v2 report with pdf-lib through a small flow layout (auto page breaks; a finding is measured first and moved to a fresh page when ≤ 60% of a page, otherwise flows — never started in the last 120pt; header/footer with report date, URL and "Page X of Y"; brand palette; WinAnsi-safe text). Content is the same stored data as the web report — every accordion's contents (per-check evidence, developer notes, category audit lists, agentic checks) are printed; a transcript of everything drawn lets tests assert parity (346/346 items on a live audit). `lib/audit/pdf/generate.ts` loads rows, writes `public/reports/audit-<token>-<layout>.pdf` and updates the same `pdfStatus/pdfUrl/pdfGeneratedAt` fields as V1; the layout version in the file name invalidates cached legacy-layout PDFs. Route `GET /api/audit/[token]/pdf` dispatches by engine (V1 layout unchanged), regenerates a stale or missing v2 file, names the download `<business>-seo-audit-<date>.pdf`, and returns a generic 500 message on failure. The worker's `pdf-queue` job carries `engine` and dispatches the same way. Report UI: `DownloadPdfButton` next to the heading and in a closing card (fetch-based so failures show inline; the href remains a plain link).

**Customer PDF, technical PDF, personalised message, private storage (2026-09-16, later).** The PDF is now two documents from the same stored data: `lib/audit/pdf/customerPdf.ts` (cover + "A message for <business>", website health with our pillars and Google's five checks per tested page/device, the most consequential problems with what/why/what-to-do, a five-item action plan, and a complete findings summary — no check ids, code or raw HTML; ~7 pages for a 20-finding audit) and `lib/audit/pdf/technicalPdf.ts` (everything, with evidence, URLs, ids and developer notes). Shared layout/flow in `lib/audit/pdf/layout.ts`. `lib/audit/view/message.ts` builds the message deterministically from stored rows (no AI call; identical text for the same audit; nothing unmeasured is mentioned; no outcome claims). Web: primary "Download PDF" beside the heading (below it on phones), "Download technical report" as a small link; bottom card removed. Route: `?variant=technical`; download names `<business>-seo-audit-<date>.pdf` / `…-technical-report-<date>.pdf`; report links use `publicReportBaseUrl()` (`REPORT_PUBLIC_BASE_URL`, else `APP_BASE_URL` unless it is a localhost/private address, else the production site) so a dev URL never reaches a customer. **Storage:** v2 PDFs are written to `storage/reports` (outside `public/`, gitignored) and served only by the route — `pdfUrl` stores `private:<file>`; `resolvePdfPath` rejects anything outside the two report directories. Legacy V1 PDFs stay in `public/reports` with their `/reports/...` links (reachable only with the full audit token, the same secret as the report URL). Findings regrouped so titles match evidence: server response = TTFB/server-response only ("Very large HTML documents" and redirects stand alone); "Images are missing alt text" vs "Images have no set size or are too large"; the font-display diagnostic and image-savings diagnostic are their own findings; outcome-claim copy softened.

**Cost per audit (measured):** OpenAI 2–5 calls (self-serve cap 5), ~1.2–4.9k input tokens and ~1.4–2k output tokens per call with the configured reasoning model (≈ 12k in / 8k out for 5 pages); PageSpeed 8–10 calls (4–5 pages × 2). Nothing is re-fetched when a report is opened.

---

## 1. Current architecture

### 1.1 How an audit starts (three entry points, two pipelines)

| Entry | Path | What happens |
|---|---|---|
| **Self-serve (public)** | `components/Hero.tsx` → `/free-dental-audit` (`app/free-dental-audit/page.tsx`) | Form posts to `POST /api/audit/inbound-trigger`. Route resolves the business via `lib/siteProfile.server.ts` (Places + HTML), upserts `Business`, creates `Audit{status:PENDING}`, runs `checkWebsite()` (`lib/websiteCheck.server.ts`) for the 3-tile preview, **and** enqueues `analysis-queue`. The visitor then submits contact details to `POST /api/audit/unlock-lead`, which creates `Contact` + `ConsentRecord` and **re-runs the whole analysis inline** (`analyzeWebsite` → `findLocalMarketPosition` → `computeAuditScores`), writes results, marks the audit `COMPLETED`, enqueues `pdf-queue`, and redirects to `/audit/[publicToken]`. |
| **Campaign discovery (admin)** | `discovery-queue` in `dental-worker.ts` | For each discovered business: create `Audit{PENDING}` → enqueue `analysis-queue`. |
| **Admin re-run** | `POST /api/admin/audits/run` | Finds/creates the latest audit, enqueues `analysis-queue`. |

`analysis-queue` is consumed by the **Analysis Worker** in `dental-worker.ts` (needs `npm run worker`). It runs the same three functions as `unlock-lead`, plus `generateAuditSummaryWithOpenAI()` and `initiateAutomaticOutreach()`. So the self-serve audit is computed **twice** (inline + worker), and only the worker path ever gets an AI summary — in dev, with no worker running, the queued job just sits.

### 1.2 Routes / APIs involved

```
POST /api/audit/detect-site            identity lookup (name/city/industry/rating) — new yesterday
POST /api/audit/inbound-trigger        create Business+Audit, preliminary check, enqueue
POST /api/audit/unlock-lead            lead capture + inline analysis + PDF enqueue
GET  /api/audit/[publicToken]          report JSON (scorecard, findings, narrative, competitors)
GET  /api/audit/[publicToken]/pdf      PDF (generates on demand if not READY)
POST /api/audit/[publicToken]/book-meeting | request-visit   consultation CTAs
GET  /api/admin/audits, POST /api/admin/audits/run, GET /api/admin/businesses/[id]
Queues (lib/queue.ts): discovery-queue, analysis-queue, pdf-queue, outreach-queue (BullMQ/Redis)
```

### 1.3 How the website is "crawled"

There is **no crawl**. Three independent single-page fetches of the homepage:

- `lib/websiteAnalyzer.ts#analyzeWebsite` — one `fetch` with an iPhone UA, 6 s timeout, regex over the raw HTML.
- `lib/websiteCheck.server.ts#checkWebsite` — one `fetch` (bot UA, 8 s) for the preview tiles only.
- `lib/siteProfile.server.ts` — homepage + up to two of `/contact`, `/contact-us`, `/about`, `/about-us`, `/locations`, for identity only.

No link following, no `robots.txt`, no sitemap, no DOM parser, no JS rendering. A JS-rendered site (e.g. pizzanova.com) yields nothing.

### 1.4 Data collected per page (homepage only)

`WebsiteSignals`: `reachable, httpStatus, error, isHttps, responseTimeMs, hasViewportMeta, pageTitle, metaDescription, hasClickToCall, hasBookingCta, hasContactForm, hasSchemaMarkup, hasVisibleAddress, hasVisiblePhone, checkedAt`.
Plus business identity from `siteProfile`: name, city/state/country, address, phone, industry, Google rating & review count, place id.

### 1.5 Scoring (`lib/auditScorer.ts`)

Five fixed categories, each 0–100:

| Category | Formula |
|---|---|
| WEBSITE_QUALITY | 0 if unreachable, else 60 + 15 (https) + 15 (<2000 ms) + 10 (viewport) |
| CONVERSION | 0 if unreachable, else 40 + 20 (tel:) + 20 (booking words) + 20 (form) |
| LOCAL_VISIBILITY | 90 / 55 / 35 by verified local-pack rank; 25 if checked & absent; 45–65 estimate otherwise |
| REPUTATION | 50 ± rating/review-count steps (now only with verified data) |
| COMPETITOR_GAP | from real competitor review gap when a DataForSEO lookup ran, else neutral 50 |

**Opportunity Score** = `clamp(100 − 0.4 × avg(category), 35, 95)`. It is an *inverse* of health (perfect site → 60, dead site → 95) but the report presents it as if higher were better ("67/100 Opportunity" next to a green bar).

### 1.6 How findings are stored

- `Audit` — `score`, `summaryText`, PDF fields, view counters.
- `AuditResult` (5 rows per audit) — `category`, `score`, `findingsJson` (flat bag of booleans/numbers), `detailsJson {title, description, recommendation}`.
- `Competitor` — name, website, rank, mapScore.
- `EngagementEvent` — `audit_completed`, `report_view`, etc.
- Re-runs `deleteMany` and overwrite — no history.

### 1.7 How the final report is generated

- `GET /api/audit/[publicToken]` builds `scorecard` (5 numbers), `findings` (5 category cards), `competitors`, and `narrative` via `lib/auditNarrative.ts#buildAuditNarrative` — deterministic headline/dek, 4 stat tiles, ≤5 "fix cards", ≤2 "quiet leaks", all derived from `findingsJson`.
- `app/audit/[publicToken]/AuditReportClient.tsx` renders: letterhead header + headline + stats → "Assessment" (summaryText + Opportunity score) → "Findings by area" (5 cards) → "Top priorities" → "Also noted" → competitor bars → two consultation forms (video call / in-person) → PDF link.
- `lib/pdfGenerator.ts` — 2-page A4 via `pdf-lib`, same narrative, written to `public/reports/` on local disk.

### 1.8 Deterministic vs AI

| Deterministic | AI (OpenAI `gpt-4o-mini`, `lib/openai.ts`) |
|---|---|
| Every check, every score, category copy, narrative, fix cards, PDF | `summaryText` (2–3 sentences), `emailSubject`, `emailOpening`, `topFindings`/`recommendedActions`/`salesTalkingPoints` (computed but **never stored or shown**) |
| | Worker path only; self-serve inline path uses the template fallback. Template fallback also used when key missing. |

### 1.9 External APIs

| API | Used for | Where |
|---|---|---|
| Google Places (New `places:searchText` → legacy fallback; legacy `textsearch`/`details`) | identity, rating, reviews; campaign discovery | `lib/siteProfile.server.ts`, `lib/discoveryProvider.ts` |
| DataForSEO `serp/google/maps/live/advanced` | local-pack rank + top competitors (only when `DATA_MODE=live` and login set) | `lib/dataforseo.ts`, `lib/discoveryProvider.ts#findLocalMarketPosition` |
| OpenAI chat completions | summary/email copy | `lib/openai.ts` |
| Apollo, Gmail SMTP, Google Calendar OAuth | contacts, outreach, booking — not audit-related | `lib/apollo.ts`, `lib/email.server.ts`, `lib/googleCalendar.ts` |

Not used today: PageSpeed Insights / CrUX, Search Console, any backlink or keyword-volume source, Safe Browsing.

### 1.10 Database models related to audits

`Audit`, `AuditResult`, `Competitor`, `Business` (category, rating, reviewCount, googlePlaceId, address, opportunityScore), `Contact`, `ConsentRecord`, `EngagementEvent`, `Appointment` (consultation bookings). Enums: `AuditStatus {PENDING, RUNNING, COMPLETED, FAILED}`, `BusinessStatus`.

### 1.11 Client-facing report UI

`AuditReportClient.tsx` (553 lines, client-fetches JSON). Two-column layout; left = narrative/findings/priorities/competitors; right = consultation forms. Uses `StatusBadge` (`healthy / opportunity / attention` from score), `CATEGORY_META` icons (now industry-aware), `Reveal` animations elsewhere. Sample preview on the homepage (`components/SampleAuditPreview.tsx`) promises the same 5-area model with hardcoded example scores.

---

## 2. Current limitations

1. **Homepage-only, regex-only.** No crawl, no DOM, no rendering. Most real SEO problems (duplicate titles, thin service pages, broken links, orphan pages, redirect chains, noindex leaks, missing canonicals) are invisible.
2. **Speed is not speed.** `responseTimeMs` is server-side TTFB+download from wherever the app runs. No LCP/CLS/INP, no lab vs. field distinction.
3. **Five blobs, not findings.** Each category is one score + one paragraph. There is no itemised issue list, no per-URL evidence, no severity, no counts. "Top priorities" is a hand-picked ≤5 list in `auditNarrative.ts`.
4. **Scores are baselines, not measurements.** Website starts at 60, Conversion at 40; a site with nothing but HTTPS scores 75. The Opportunity Score is inverted and clamped to 35–95, so every business lands in a ~30-point band.
5. **No search data.** One maps query at most. No organic rankings, no keyword volumes, no "what are they ranking for", no competitor organic comparison.
6. **Two divergent pipelines** (`unlock-lead` inline vs. worker) doing the same work; AI summary only in one of them; PDF payloads drifted (fixed yesterday).
7. **No history.** Re-running an audit destroys the previous one; no "improved since last month".
8. **PDF on local disk** (`public/reports`) — breaks under `output: "standalone"` on multiple instances; R2 vars exist in `env.server.ts` but nothing uses them.
9. **Dental residue** in the report shell: page `<title>` "Your Practice Growth Audit", header label "Practice", "Practice Assessment" heading, `/free-dental-audit` route name, sample preview copy.
10. **Security gaps:** `inbound-trigger`/`analyzeWebsite` fetch any URL (private ranges included); no per-IP rate limit on the public audit endpoints; no size/time budget across the whole job.
11. **Heuristics that lie:** booking-CTA and phone/address regexes fire on marketing copy; `hasSchemaMarkup` doesn't validate the schema type; "mobile optimized" is only the viewport meta tag.
12. **Nothing for a developer.** No URLs, no HTML snippets, no expected values, no "here is the tag to add".

---

## 3. Proposed report structure

The requested A–E structure fits the codebase well; two adjustments: make **Local SEO** its own section that appears only for businesses with a physical location (Places hit or detected address), and add a short **Appendix** so the developer has the raw material. Everything below is data-driven from `AuditFinding` rows; the UI (later) just groups and sorts.

```
A. Executive Summary
   - Overall SEO Health + pillar scores (Technical, Content, Search Opportunity, Local*)
   - Severity counts (Critical/High/Medium/Low/Opportunity) and pages crawled
   - "In plain English" — 3–5 sentences (AI, evidence-locked; template fallback)
   - Top 3 things costing you {customers} right now  (highest priorityScore, any pillar)
   - Top 3 things you're doing right              (passed checks with highest weight)
   - Trend vs. previous audit (when one exists)

B. Technical SEO
   B1 Crawlability & indexability  (robots.txt, sitemap, noindex, canonicals, status codes, redirects)
   B2 Site architecture             (depth, orphan pages, internal links, URL hygiene, pagination)
   B3 Performance & Core Web Vitals (PSI lab + CrUX field; TTFB; page weight; images)
   B4 Mobile & accessibility basics (viewport, tap targets, font sizes, lang)
   B5 Security                      (HTTPS, mixed content, HSTS, redirect http→https, www consistency)
   B6 Structured data               (types present, validation errors, missing LocalBusiness/Org)

C. On-Page & Content SEO
   C1 Titles & meta descriptions    (missing, duplicate, too long/short, keyword absent)
   C2 Headings                      (missing/multiple H1, hierarchy)
   C3 Content quality               (thin pages, word count, duplicate content, readability)
   C4 Images                        (alt text, oversized, next-gen formats, lazy loading)
   C5 Internal linking & anchors
   C6 Trust / E-E-A-T signals       (about, contact, NAP consistency, reviews, privacy, author)
   C7 Conversion path               (tap-to-call, primary CTA, forms — carried over from today)

D. Search & Growth Opportunities
   D1 Keyword & ranking snapshot    (target keywords from industry template + site content; positions)
   D2 Competitor comparison         (top 3 organic + local competitors: rankings, reviews, page count)
   D3 Content gaps                  (service/location pages the industry expects that are missing)
   D4 Quick wins                    (page-2 keywords, striking-distance pages, unclaimed SERP features)

L. Local SEO (only when a location exists)
   Google Business Profile presence, rating & review count vs. competitors, local-pack rank,
   NAP consistency between site & Places, LocalBusiness schema, location pages, map embed

E. Prioritized Action Plan
   - Table sorted by priorityScore: title · severity · impact · effort · pages · who (owner/developer/us)
   - Grouped into: This week (quick wins) · This month · This quarter
   - Each row expands to the full finding (evidence, detected vs. expected, fix, code snippet)
   - Closing CTA: "We can implement items 1–N for you" (book a call / request a quote)

Appendix
   - Crawled URLs with status, title, indexable, word count, issues count
   - Methodology & data sources with timestamps and what could not be checked
```

---

## 4. Proposed audit data / schema

Additive Prisma migration; existing `AuditResult`/`Competitor` stay for backward compatibility during the transition and can be dropped in the last phase.

```prisma
enum FindingSeverity { CRITICAL HIGH MEDIUM LOW OPPORTUNITY }
enum FindingPillar   { TECHNICAL CONTENT SEARCH LOCAL CONVERSION }
enum AuditEngine     { LEGACY_V1 CRAWL_V2 }

model Audit {
  // existing fields unchanged …
  engine          AuditEngine @default(LEGACY_V1)
  configJson      Json?          // { maxPages, includePsi, includeSerp, keywords[] }
  startedAt       DateTime?
  completedAt     DateTime?
  errorMessage    String?
  // pillar scores (null when a pillar wasn't applicable)
  overallScore    Int?
  technicalScore  Int?
  contentScore    Int?
  searchScore     Int?
  localScore      Int?
  crawlStatsJson  Json?          // { pagesCrawled, pagesSkipped, robotsBlocked, durationMs, sources: {psi, serp, places} }
  summaryJson     Json?          // AI/template exec summary: { headline, paragraph, wins[], risks[] , model, isAiGenerated }
  pages           AuditPage[]
  findings        AuditFinding[]
  keywords        AuditKeyword[]
}

model AuditPage {
  id               String   @id @default(uuid())
  auditId          String
  audit            Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  url              String
  finalUrl         String?
  statusCode       Int?
  redirectChainJson Json?          // ["http://…", "https://…", "https://www…"]
  contentType      String?
  depth            Int      @default(0)
  discoveredVia    String?         // "seed" | "sitemap" | "link:<parentUrl>"
  inSitemap        Boolean  @default(false)
  fetchMs          Int?
  htmlBytes        Int?
  isHttps          Boolean?
  mixedContent     Boolean?
  title            String?
  titleLength      Int?
  metaDescription  String?
  metaDescLength   Int?
  canonical        String?
  robotsMeta       String?         // "noindex,nofollow" …
  xRobotsTag       String?
  indexable        Boolean?
  lang             String?
  viewport         Boolean?
  h1Json           Json?           // ["…"]
  headingCounts    Json?           // { h1:1, h2:4, h3:9 }
  wordCount        Int?
  textHash         String?         // for duplicate-content detection
  imagesTotal      Int?
  imagesMissingAlt Int?
  internalLinks    Int?
  externalLinks    Int?
  brokenLinks      Int?
  schemaTypesJson  Json?           // ["LocalBusiness","FAQPage"]
  hasTelLink       Boolean?
  hasForm          Boolean?
  hasPrimaryCta    Boolean?
  ogTagsPresent    Boolean?
  hreflangJson     Json?
  psiJson          Json?           // PageSpeed lab+field for pages we tested (home + top 2)
  rawJson          Json?           // anything else the crawler kept (link list sample, etc.)
  fetchedAt        DateTime @default(now())
  @@index([auditId])
  @@unique([auditId, url])
}

model AuditFinding {
  id               String          @id @default(uuid())
  auditId          String
  audit            Audit           @relation(fields: [auditId], references: [id], onDelete: Cascade)
  checkId          String          // stable id from the check registry, e.g. "tech.https.missing"
  pillar           FindingPillar
  section          String          // "B1", "C4", "L", "D3" … for grouping in the report
  severity         FindingSeverity
  title            String
  affectedUrlsJson Json            // ["https://…", …] (capped at 50; count kept separately)
  affectedPageCount Int
  evidenceJson     Json            // check-specific proof: snippets, headers, numbers, timestamps
  detectedValue    String?         // "No <title>" / "3 412 ms" / "1 200 words"
  expectedValue    String?         // "50–60 chars, unique" / "< 2 500 ms LCP"
  whyItMatters     String          // template text, industry nouns substituted
  recommendedFix   String          // owner-level explanation
  developerFix     String?         // exact tag/header/config change, code snippet
  impact           Int             // 1–5
  effort           Int             // 1–5 (1 = minutes, 5 = project)
  confidence       Int             // 0–100
  priorityScore    Float           // computed, see §9
  owner            String          // "owner" | "developer" | "agency"
  createdAt        DateTime        @default(now())
  @@index([auditId, pillar])
  @@index([auditId, priorityScore])
}

model AuditKeyword {
  id            String  @id @default(uuid())
  auditId       String
  audit         Audit   @relation(fields: [auditId], references: [id], onDelete: Cascade)
  keyword       String
  source        String        // "industry_template" | "page_title" | "serp_discovered"
  position      Int?          // organic position for the business's domain, null if not top-100
  rankingUrl    String?
  searchVolume  Int?
  cpc           Float?
  topCompetitorsJson Json?    // [{domain, position}]
  checkedAt     DateTime @default(now())
  @@index([auditId])
}
```

Check registry lives in code, not the DB: `lib/audit/checks/<pillar>/<check>.ts` each exporting `{ id, pillar, section, severityDefault, weight, run(ctx) => Finding[] }`. `lib/industry.ts` gains per-industry `targetKeywords[]` and `expectedPages[]` (e.g. plumbing → "emergency plumber", "drain cleaning"; pages: services, service areas, reviews, contact).

---

## 5. Complete list of checks (with source and severity)

Legend — **Source**: C = our crawler, P = PageSpeed Insights API, G = Google Places, D = DataForSEO, S = Safe Browsing, AI = explanation only. **Sev** = default severity (can escalate by page share).

### B. Technical

| Check id | What we verify | Evidence stored | Sev | Src |
|---|---|---|---|---|
| tech.reach.unreachable | Site fails to load | error code, attempts, timestamps | Critical | C |
| tech.https.missing | Any crawled page served over HTTP | urls | Critical | C |
| tech.https.redirect | http:// does not 301 to https:// | chain | High | C |
| tech.https.mixed_content | https page loads http assets | asset urls per page | Medium | C |
| tech.https.hsts_missing | No `Strict-Transport-Security` | headers | Low | C |
| tech.host.www_inconsistent | www and non-www both 200 without redirect | both responses | Medium | C |
| tech.robots.missing / .blocks_all / .blocks_assets | robots.txt state | file body | Critical/High/Medium | C |
| tech.sitemap.missing / .invalid / .stale_urls | sitemap.xml existence, parse, 404s inside | url, sample errors | Medium | C |
| tech.index.noindex_important | noindex on home/service/contact | tag/header per url | Critical | C |
| tech.index.canonical_missing / .canonical_mismatch / .canonical_chain | canonical tag state | canonical vs url | Medium/High | C |
| tech.status.4xx / .5xx | crawled pages erroring | urls, codes | High | C |
| tech.links.broken_internal / .broken_external | links whose target ≥400 | source→target list | High/Low | C |
| tech.redirect.chain / .loop / .302_permanent | redirect quality | chain | Medium | C |
| tech.arch.depth_gt3 | pages ≥4 clicks from home | urls, depth | Medium | C |
| tech.arch.orphan_in_sitemap | sitemap URLs never linked internally | urls | Low | C |
| tech.url.uppercase / .params / .trailing_inconsistent / .long | URL hygiene | urls | Low | C |
| tech.perf.ttfb_slow | server TTFB (p50 over crawled pages) > 800 ms | ms per url | Medium | C |
| tech.perf.page_weight | HTML > 500 KB or total > 3 MB | bytes | Medium | C/P |
| tech.perf.lcp / .cls / .inp / .fcp | Core Web Vitals lab (Lighthouse) and field (CrUX) for home + top pages | metric values, mobile/desktop | High/Medium | P |
| tech.perf.render_blocking / .unused_js / .image_format | Lighthouse opportunities | savings ms/KB | Medium/Low | P |
| tech.mobile.viewport_missing | no viewport meta | url | Critical | C |
| tech.mobile.font_size / .tap_targets | Lighthouse mobile audits | element counts | Medium | P |
| tech.html.lang_missing / .charset_missing / .doctype | basic HTML validity | url | Low | C |
| tech.schema.none / .invalid_json / .missing_localbusiness / .missing_org | JSON-LD parse & types | types found, parse error | Medium/High | C |
| tech.schema.nap_mismatch | schema address/phone ≠ Places | both values | Medium | C+G |
| tech.security.safe_browsing | flagged by Google Safe Browsing | verdict | Critical | S |
| tech.security.headers | missing CSP/X-Frame/X-Content-Type | headers | Low | C |
| tech.render.js_only | body text < 100 words but JS bundles large → likely CSR | bytes, word count | High | C |
| tech.duplicate.trailing_slash / .http_https_both | duplicate page variants | pairs | Medium | C |

### C. On-page & content

| Check id | What we verify | Sev | Src |
|---|---|---|---|
| content.title.missing / .duplicate / .too_long (>60) / .too_short (<30) / .same_as_h1 / .brand_only | title tags across all pages | High/Medium/Low | C |
| content.meta.missing / .duplicate / .too_long (>160) / .too_short | meta descriptions | Medium/Low | C |
| content.h1.missing / .multiple / .empty | H1 per page | High/Medium | C |
| content.headings.skipped_levels | H2→H4 jumps | Low | C |
| content.thin_page | < 300 words on indexable non-utility page | Medium | C |
| content.duplicate_body | identical `textHash` on ≥2 URLs | High | C |
| content.readability | Flesch-Kincaid grade > 12 on service pages | Low | C |
| content.images.missing_alt / .oversized (>300 KB) / .no_dimensions / .legacy_format | image audit | Medium/Low | C(+P) |
| content.links.low_internal (<3) / .generic_anchor ("click here") / .nofollow_internal | internal linking | Medium/Low | C |
| content.og.missing | Open Graph / Twitter tags | Low | C |
| content.trust.no_about / .no_contact / .no_privacy / .no_nap_footer / .no_reviews_on_site | trust pages/signals | Medium/Low | C |
| content.conversion.no_tel / .no_primary_cta / .no_form / .cta_below_fold | conversion path (existing checks, per page) | High/Medium | C |
| content.freshness.stale | `lastmod`/dates > 24 months | Low | C |
| content.keyword.title_no_service_term / .no_location_term | primary keyword + city absent from title/H1 of home & service pages | Medium | C |

### D. Search & growth

| Check id | What we verify | Sev | Src |
|---|---|---|---|
| search.rank.snapshot | positions for 10–20 target keywords ({service} {city}, {service} near me, brand) | info | D |
| search.rank.not_ranking_core | no top-100 position for the core service keyword | High | D |
| search.rank.page2_striking_distance | keywords at 11–20 → quick win | Opportunity | D |
| search.rank.brand_not_1 | brand query doesn't return the site at #1 | High | D |
| search.competitor.organic | top 3 domains for core keywords + their page counts/titles | info | D+C |
| search.gap.missing_service_pages | industry `expectedPages[]` not found in crawl (e.g. no "emergency plumber" page) | Opportunity | C+template |
| search.gap.missing_location_pages | multi-city service area but no location pages | Opportunity | C+G |
| search.serp.features_unclaimed | FAQ/reviews rich results available to competitors, not to site | Opportunity | D+C |
| search.volume | monthly volume/cpc for target keywords (context for prioritisation) | info | D |
| search.backlinks.summary | referring domains vs competitors (phase 4, optional) | info | D |

### L. Local (conditional)

| Check id | What we verify | Sev | Src |
|---|---|---|---|
| local.gbp.not_found | no Places listing matched to domain | Critical | G |
| local.gbp.website_mismatch | listing website ≠ audited domain | High | G |
| local.gbp.rating_low (<4.0) / .reviews_few (<20) / .reviews_behind_competitors | reputation | High/Medium | G+D |
| local.pack.not_in_top3 / .absent | map-pack rank for "{keyword} in {city}" (existing `findLocalMarketPosition`) | High/Critical | D |
| local.nap.site_vs_gbp_mismatch | address/phone on site vs Places | Medium | C+G |
| local.schema.missing_localbusiness | (cross-listed from tech) | High | C |
| local.map_embed.missing / .directions_link | map/directions on contact page | Low | C |
| local.hours.missing | opening hours absent on site and/or schema | Low | C+G |

---

## 6. Checks done by our crawler

Everything marked **C** above — i.e. all of Technical except Core Web Vitals/Lighthouse audits and Safe Browsing, all of On-page & Content, the content-gap checks, and the site-side half of NAP/hours/map checks. Roughly 60 of the ~85 checks.

Crawler design (`lib/audit/crawler.ts`):
- Seed: homepage + `sitemap.xml` (and index sitemaps) + `robots.txt` sitemaps.
- BFS, same registrable domain only, respects `robots.txt` (`User-agent: *` and our UA), `nofollow` noted but followed for discovery.
- Budgets: self-serve 40 pages / 90 s; admin-triggered 150 pages / 5 min; concurrency 4; 10 s per fetch; 2 MB per page; total 25 MB. Stop early, record `crawlStats`.
- Parse with a real HTML parser (`node-html-parser` — small, no native deps; or `cheerio`) instead of regex. Extract everything in `AuditPage`.
- Link checker: HEAD (fallback GET) on a sample of ≤200 unique internal + ≤50 external links, 5 s each.
- SSRF guard reused from `detect-site`: public hostnames only, block private/link-local ranges after DNS resolution, follow max 5 redirects.
- Per-audit fetch cache so `siteProfile`, crawler and checks never fetch the same URL twice.
- Rendering (Phase 4, optional): `playwright-core` headless for the homepage only when `tech.render.js_only` fires, to re-extract content.

## 7. Checks that require external APIs

| API | Checks | Cost / notes |
|---|---|---|
| **Google PageSpeed Insights v5** (free, key recommended, 25k/day) | all `tech.perf.*` CWV & Lighthouse opportunities, `tech.mobile.font_size/tap_targets`, `content.images.legacy_format` | 2 calls (mobile+desktop) × up to 3 pages. Already have a Google key; enable the API on it. |
| **Google Places** (already integrated) | all `local.gbp.*`, NAP comparisons, `search.gap.missing_location_pages` (service-area listing) | reuse `lib/siteProfile.server.ts` result — no extra calls. |
| **DataForSEO SERP organic live** (`/v3/serp/google/organic/live/advanced`) | `search.rank.*`, `search.competitor.organic`, `search.serp.features_unclaimed` | ~$0.002/keyword; 15 keywords ≈ $0.03/audit. Existing auth helper `getDataForSeoAuthHeader`. |
| **DataForSEO Keywords Data** (`/v3/keywords_data/google_ads/search_volume/live`) | `search.volume` | ~$0.05/request for 15 keywords. |
| **DataForSEO Maps** (already) | `local.pack.*`, competitor reviews | existing `searchDataForSeoMaps`. |
| **DataForSEO Backlinks summary** (phase 4) | `search.backlinks.summary` | ~$0.02/domain. |
| **Google Safe Browsing v4** (free) | `tech.security.safe_browsing` | 1 call. |
| **CrUX API** (free) | field CWV when PSI field data is absent | optional; PSI already returns CrUX when available. |

All API-backed checks degrade to "not checked (reason)" — never to a guessed value — and the report's Appendix lists what was skipped.

## 8. Checks that use AI only for explanation / interpretation

AI never decides *whether* something is an issue, its severity, or a score. Inputs to every prompt are the structured `AuditFinding`/`AuditPage` rows; outputs are validated JSON and labelled `isAiGenerated` in `summaryJson`.

| Use | Input | Output | Fallback |
|---|---|---|---|
| Executive-summary paragraph + "top wins / top risks" phrasing | pillar scores, top 6 findings by priority, industry nouns, city | 3–5 sentences; must reference only supplied findings (post-validated: every number in the output must appear in the input) | current template in `lib/openai.ts` |
| "Why it matters" tailoring | template text + industry profile | rewritten in the business's vocabulary | template text as-is |
| Title/meta suggestions | current title, H1, first 200 words, target keyword, city | 2 suggested titles ≤ 60 chars, 1 meta ≤ 155 chars, labelled "suggestion" | none (field left empty) |
| Content-gap page briefs | missing expected page, competitor page titles | 1-line brief per page ("Emergency Plumbing Toronto — 24/7 …") | list of missing page names only |
| Outreach email subject/opening (existing) | unchanged | unchanged | existing |

Model: keep `gpt-4o-mini` via `lib/openai.ts`; one call per audit for the summary, one batched call for title suggestions (top 10 pages). Add a hard cap of 3 AI calls/audit.

---

## 9. Scoring and prioritisation

### 9.1 Finding priority

```
severityWeight = { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1, OPPORTUNITY: 4 }
pageShare      = affectedPageCount / max(1, indexablePagesCrawled)   // 0–1
reach          = 0.5 + 0.5 * pageShare                               // a site-wide issue counts double a single-page one
homeBonus      = affects homepage or a top-3 traffic page ? 1.25 : 1
priorityScore  = severityWeight * impact(1–5) * reach * homeBonus * (confidence/100) / effort(1–5)
```
Sorted desc → Action Plan. Buckets: `This week` = effort ≤ 2 and severity ≥ HIGH or OPPORTUNITY with impact ≥ 4; `This month` = the next tier; `This quarter` = effort ≥ 4.

### 9.2 Pillar scores (0–100, start at 100, subtract)

Each check has `weight` (max points it can remove from its pillar). Penalty applied = `weight × min(1, pageShare × 2)` so a problem on half the site costs full weight, on one page of forty costs 5 %. Example weights: `tech.https.missing` 40, `tech.robots.blocks_all` 40, `tech.index.noindex_important` 30, `tech.perf.lcp` 15, `content.title.missing` 15, `content.h1.missing` 10, `content.thin_page` 10, `local.gbp.not_found` 40, `local.pack.absent` 25, `search.rank.not_ranking_core` 30.

- **Technical Health** = 100 − Σ penalties(B checks), floor 0.
- **Content / On-page** = 100 − Σ penalties(C checks).
- **Search Opportunity** = 100 − Σ penalties(D checks); if DataForSEO unavailable → `null` and shown as "not measured", not a fake number.
- **Local SEO** = 100 − Σ penalties(L checks); only when location exists.
- **Overall SEO Health** = weighted mean of available pillars: Technical 0.35, Content 0.30, Search 0.20, Local 0.15; weights renormalised when a pillar is `null`.

Grades on the report: 90+ Excellent · 75–89 Good · 55–74 Needs work · <55 At risk. The old inverted `opportunityScore` on `Business` is kept for the admin pipeline sort but derived as `100 − overallScore`.

### 9.3 Severity escalation rules

- MEDIUM → HIGH when `pageShare ≥ 0.5`; HIGH → CRITICAL when it affects the homepage **and** the core service page.
- Anything with `confidence < 60` is capped at MEDIUM and rendered with a "verify" note.

---

## 10. Implementation phases

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Plumbing (1–2 days)** | Unify pipelines: `unlock-lead` stops analysing inline and only enqueues; report page polls `GET /api/audit/[token]` (status `RUNNING` → skeleton). Add `audit-queue` job `run-audit-v2` in the worker with a per-audit fetch cache and SSRF guard. Migration for new models. `Audit.engine` flag so old reports keep rendering. | One code path, safe fetching, schema ready. |
| **1 — Crawler + Technical/Content checks (1 week)** | `lib/audit/crawler.ts`, `lib/audit/checks/{technical,content}/*`, `lib/audit/scoring.ts`, `lib/audit/priority.ts`. Port the existing signals into per-page checks. Findings written to `AuditFinding`; pillar scores on `Audit`. Report API returns the new shape alongside the old narrative. | Real, itemised, per-URL findings with evidence for ~60 checks. |
| **2 — External enrichment (3–4 days)** | PageSpeed Insights client (`lib/audit/providers/pagespeed.ts`), Safe Browsing, DataForSEO organic SERP + volume client (extend `lib/dataforseo.ts`), Places-based Local checks reusing `siteProfile`. Industry `targetKeywords`/`expectedPages` in `lib/industry.ts`. | CWV, rankings, local pillar, content gaps. Cost ≈ $0.10/audit. |
| **3 — Narrative & report shape (3 days)** | Replace `buildAuditNarrative` internals with a generator over findings: exec summary (AI, validated), section grouping, action-plan buckets. Rewrite `pdfGenerator` to render the same structure (or switch to HTML→PDF via Playwright/Chromium for a multi-page report). Move PDFs to R2 (env vars already exist). | Report data complete; PDF matches web. UI redesign can then start. |
| **4 — Depth & history (later)** | Headless rendering for JS sites, backlinks summary, audit-to-audit diff ("since last audit"), scheduled re-audits for converted clients, admin finding viewer. | Retention/upsell features. |

Phases 1–3 can ship behind `Audit.engine = CRAWL_V2` while the public page keeps using v1 until the UI is redesigned.

---

## 11. Files / modules that change

**New**
```
lib/audit/crawler.ts                 BFS crawler, robots/sitemap, budgets, parser → AuditPage rows
lib/audit/fetch.ts                   shared safe fetch (SSRF guard, timeouts, size caps, per-audit cache) — extract from detect-site route
lib/audit/context.ts                 AuditContext { audit, business, industry, pages, profile, providers }
lib/audit/checks/index.ts            registry + runner
lib/audit/checks/technical/*.ts      ~30 checks
lib/audit/checks/content/*.ts        ~25 checks
lib/audit/checks/search/*.ts         ~10 checks
lib/audit/checks/local/*.ts          ~8 checks
lib/audit/scoring.ts                 pillar + overall scores (§9.2)
lib/audit/priority.ts                priorityScore, buckets, severity escalation (§9.1, §9.3)
lib/audit/report.ts                  builds the A–E report payload from DB rows (replaces auditNarrative for v2)
lib/audit/providers/pagespeed.ts     PSI v5 client
lib/audit/providers/safeBrowsing.ts
lib/audit/providers/dataforseoSerp.ts  organic SERP + search volume (extends lib/dataforseo.ts)
lib/audit/explain/summary.ts         AI exec summary with validation + template fallback (uses lib/openai.ts)
lib/audit/explain/suggestions.ts     title/meta/content-brief suggestions
prisma/migrations/<ts>_audit_v2/     new models + Audit columns
```

**Modified**
```
prisma/schema.prisma                 §4 models; Audit columns; enums
lib/env.server.ts                    PAGESPEED_API_KEY (optional; falls back to GOOGLE_PLACES_API_KEY if same project), SAFE_BROWSING_API_KEY, AUDIT_MAX_PAGES, AUDIT_ENGINE default
lib/queue.ts                         add auditQueue ("audit-queue")
dental-worker.ts                     new "run-audit-v2" worker; analysis worker delegates to it; PDF job reads findings
app/api/audit/inbound-trigger/route.ts   enqueue only (keep preview tiles from checkWebsite)
app/api/audit/unlock-lead/route.ts   remove inline analysis; mark lead; if audit not COMPLETED, respond with status and let the page poll
app/api/audit/[publicToken]/route.ts return v2 payload (engine-aware); include status for polling
app/api/audit/[publicToken]/pdf/route.ts  v2 PDF; R2 upload
app/api/admin/audits/run/route.ts    enqueue v2 with admin budget
app/api/admin/businesses/[id]/route.ts   expose findings for admin
lib/industry.ts                      + targetKeywords[], expectedPages[], localRelevant flag per profile
lib/siteProfile.server.ts            use lib/audit/fetch.ts; expose raw Places listing (hours, address components) for Local checks
lib/dataforseo.ts                    organic SERP + volume functions; shared error handling
lib/openai.ts                        generic JSON-completion helper reused by explain/*
lib/pdfGenerator.ts                  render v2 structure (or replaced by HTML→PDF in Phase 3)
lib/auditNarrative.ts, lib/auditScorer.ts, lib/websiteAnalyzer.ts   kept for engine=LEGACY_V1 only; deleted after Phase 3
app/audit/[publicToken]/AuditReportClient.tsx   (UI phase, later) render A–E sections from v2 payload
components/SampleAuditPreview.tsx    (UI phase) show the new pillar model
app/free-dental-audit/page.tsx       processing screen polls status; progress messages from crawlStats
docs/                                this plan; update mvp-readiness/integration-audit when shipped
package.json                         + node-html-parser (or cheerio); + playwright-core (Phase 4 only)
```

**Reused as-is**
`lib/siteProfile.server.ts` (identity, Places), `lib/discoveryProvider.ts#findLocalMarketPosition` (map pack), `lib/websiteCheck.server.ts` (preview tiles), `lib/analytics.ts`/`lib/events.ts` (events), `lib/queue.ts` pattern, `components/ui/*`, consultation endpoints (`book-meeting`, `request-visit`), outreach pipeline.
