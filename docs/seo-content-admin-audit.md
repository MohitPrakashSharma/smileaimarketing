# SEO, Content, Admin & Analytics — Current-State Audit

Audit date: 2026-08-04. This is a planning document only — no implementation changes were made as part of this audit. It builds directly on `docs/integration-audit.md` (backend/provider audit) and the prior UI/UX redesign phase; both are assumed context here rather than repeated.

## 1. Public Routes (current)

| Route | Type | Notes |
|---|---|---|
| `/` | Static-eligible, composed of many `"use client"` sections | Landing page. Recently redesigned to 7 sections + header/footer. |
| `/free-dental-audit` | Client-rendered wizard | Website+city → processing → preview → contact gate. |
| `/audit/[publicToken]` | Server component wrapper + client report | Personalized report, must stay dynamic/uncached (private data). |
| `/book-consultation` | Client-rendered form | Online/in-person booking, chains 3 API calls. |
| `/thank-you`, `/privacy`, `/unsubscribe` | Static-eligible | Simple content/forms. |
| `/admin/*` (login, businesses, audits, appointments, outreach, campaigns, pipeline, settings, and the new `/admin` overview) | Client-rendered, session-gated via `middleware.ts` | Internal tool, correctly excluded from public SEO concerns. |
| `/api/*` | 14 route handlers | See `docs/integration-audit.md` for full contract inventory. |

**Nothing exists yet at**: `/services/*`, `/locations/*`, `/case-studies/*`, `/insights/*`, `/sample-dental-audit`. All are net-new.

## 2. Metadata, Sitemap, Robots, JSON-LD, Canonicals

This is in noticeably better shape than the rest of the SEO surface:

- `app/layout.tsx` already has a proper root `Metadata` object: title template (`%s | Smile AI Marketing`), description, keywords, `metadataBase`, `alternates.canonical: "/"`, full Open Graph + Twitter card blocks pointing at a working dynamic `/opengraph-image` route (`app/opengraph-image.tsx`, renders via `next/og`), and `robots: { index: true, follow: true }`.
- `app/robots.ts` and `app/sitemap.ts` both exist and are valid, but `sitemap.ts` currently lists **only the homepage** — expected, since no other public content routes exist yet.
- JSON-LD exists only on `/` (`app/page.tsx`): a `ProfessionalService` block and a `FAQPage` block generated from `components/faqData.ts` (5 questions post-redesign). No `BreadcrumbList`, `Article`, `Service`, or `WebSite` structured data anywhere, because no service/article/breadcrumb-bearing pages exist yet.
- No `LocalBusiness` structured data exists — correct per the brief's constraint, since there's no verified physical location to attach it to.
- Canonical handling is currently trivial (one page). A per-route `generateMetadata` pattern will be needed once `/services/*`, `/locations/*`, `/case-studies/*`, `/insights/*` exist — none of that scaffolding exists today.

**Finding**: the *foundation* (Metadata API usage, OG image generation) is solid and reusable. The *content graph* it should describe is almost entirely unbuilt.

## 3. Content System

There is no content system of any kind:

- No CMS, no MDX pipeline, no `content/` directory, no database model for articles/insights.
- No blog, no `/insights` route, no draft/review/publish workflow.
- No case-study model, page, or admin flow — `grep` for "case-stud" across the app returns nothing.
- No revalidation logic (`revalidatePath`/`revalidateTag`) exists anywhere, because nothing is currently published dynamically.

**What does exist and should inform the content plan** (found in `seo/`, not part of the app itself):

- `seo/keyword-research.csv` (205 rows) and `seo/keyword-research-top-picks.csv` (49 rows) — real DataForSEO keyword-suggestion pulls, already scoped to exactly the topic areas this brief asks for (home, local-seo, patient-generation, website-design, paid-ads, reputation, pricing-services, about, plus an "AI angle" competitor-term probe).
- `seo/content-plan.csv` — an existing page-by-page content plan (status: "BUILT NOW" for homepage, "planned" for 8 other pages) with primary keyword, volume, difficulty, search intent, and section purpose per page, plus a homepage section map.
- `seo/competitor-scan.csv` — a 7-competitor positioning scan (Firegang, Progressive Dental Marketing, Lasso MD, Harris & Ward, GrowDent, Wonderist, and generalist agencies) with each one's observed content/positioning gap.
- `scripts/dataforseo-keyword-research.mjs` — the script that produced the CSVs. Worth noting: it already follows the "compute Basic auth at runtime, never store the base64 form" pattern established in `lib/env.server.ts`, and it reads `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` directly from `process.env` rather than the new validated module (minor, low-priority: could be migrated to import `getDataForSeoAuthHeader()` from `lib/env.server.ts` for consistency, once that module is the established pattern).

This existing research is a real asset — `docs/2026-content-strategy.md` builds directly on it rather than starting from zero, and confirms the DataForSEO credentials in `.env` were in fact previously used for a live pull, reinforcing the integration audit's rotation recommendation.

## 4. Admin Dashboard, Campaign Workflow, Automation Controls

- **Admin dashboard**: already redesigned in the prior phase — no permanent sidebar, top nav (desktop) + bottom nav (mobile), a new `/admin` Overview page with real work-queue cards (audits ready for review, hot leads, follow-ups due, emails awaiting approval, online meetings, in-person requests, recent activity) built from existing `/api/admin/*` endpoints. This substantially satisfies sections 12–13 of this brief's admin-UX ask already; the plan document below focuses on the *gap*, not a rebuild.
- **Campaign workflow**: `/admin/campaigns` is a single-step form (name, city, category) that immediately creates 3 hardcoded fake businesses (see `docs/integration-audit.md`). There is no multi-step wizard, no lead-criteria configuration, no audit configuration, no outreach configuration step, and no campaign status machine beyond the schema's `CampaignStatus` enum (`DRAFT/ACTIVE/PAUSED/COMPLETED`) — which nothing in the UI ever sets to anything but `ACTIVE`.
- **Automation controls**: no automation/workflow status page exists anywhere. `dental-worker.ts` runs (if started manually) with zero visibility from the admin UI — no way to see it's alive, see job counts, pause it, or view logs.
- **n8n**: zero references anywhere in the repository (code, config, docs, `docker-compose.yml`). If an n8n instance already exists in the broader infrastructure (the brief's phrasing — "the current server has multiple existing containers," "continue using the existing Traefik and Cloudflare setup" — implies it does), this repo has no knowledge of it: no `N8N_URL`, no webhook endpoints for it to call, no API key placeholder. See `docs/n8n-decision-plan.md`.

## 5. Analytics

Zero analytics implementation exists:

- No `gtag`, no GA4, no `next/third-parties` usage, no internal event table, no analytics abstraction module.
- Nothing in the current funnel (audit wizard, report view, booking forms, admin actions) emits any tracked event.
- No `ANALYTICS_*` or `GA4_*` environment variables exist in `.env` or `.env.example` (the integration-phase `.env.example` did not include them — this plan proposes adding them, see `docs/analytics-measurement-plan.md`).

## 6. Rendering & Caching Behavior

- The homepage (`app/page.tsx`) is a plain server component that composes many `"use client"` sections — normal and fine for a mostly-static marketing page; there is no explicit `revalidate` export anywhere in the app, but there's also nothing dynamic on `/` yet to need one.
- `/audit/[publicToken]` and all `/admin/*` pages are inherently request-time/dynamic (session-gated or personalized) — correctly never statically rendered today (they fetch client-side after mount).
- No `fetch` call anywhere in the app currently passes `next: { revalidate, tags }` — there is no caching of any external-provider response, because no external provider is called yet. This means section 11's "don't call providers on every request, cache normalized results with a freshness window" concern is *forward-looking*, not a bug to fix — there's simply nothing to fix yet.
- No ISR (`generateStaticParams` + revalidate) is configured anywhere, consistent with there being no dynamic content routes yet.

## 7. Summary: What This Phase's Planning Docs Need to Cover

Given the near-total absence of a content/SEO/analytics layer, the five companion documents (`2026-content-strategy.md`, `case-study-system.md`, `admin-workflow-plan.md`, `analytics-measurement-plan.md`, `n8n-decision-plan.md`) are genuinely greenfield plans, not "fix what's broken" audits — grounded in what already works well (the Metadata API foundation, the redesigned admin shell, the existing keyword research) so implementation can build on real assets rather than duplicate them.
