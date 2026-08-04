# SEO, Content, Admin & Analytics — Phase Handoff

This phase was scoped, per the brief's own instruction, to **audit and planning documents only** — "do not begin large implementation changes until the audit is complete," "begin with the audit and planning documents," "do not immediately generate dozens of articles or location pages." No public pages, content models, or analytics code were implemented in this pass; two small, safe, code-level fixes carried over from the adjacent integrations phase are noted in §16.

## 1. Audit Findings

Full detail in `docs/seo-content-admin-audit.md`. Headline findings:

- The Metadata API foundation (`app/layout.tsx`), sitemap/robots, and OG image generation are already solid and reusable — not rebuilt here.
- No content system, case-study system, blog, or `/insights`/`/services`/`/locations`/`/case-studies` routes exist at all — this is greenfield, not a fix-what's-broken audit.
- No analytics of any kind exists — zero tracked events anywhere.
- No n8n reference exists in this repo (confirmed separately deployed — see `docs/n8n-decision-plan.md`).
- Real, usable keyword research already exists in `seo/*.csv` (produced by `scripts/dataforseo-keyword-research.mjs`) and directly informed the content strategy rather than being ignored.
- The admin command-centre shell (no sidebar, top/bottom nav, work-queue Overview page) was already built in the prior UI/UX redesign phase — this phase's admin plan describes the delta (Content nav item, campaign wizard, automation control centre), not a rebuild.

## 2. SEO Architecture

`docs/2026-content-strategy.md` — positioning ("local patient-growth systems for dental practices," grounded in a real 7-competitor gap analysis in `seo/competitor-scan.csv`), full page architecture (`/services/*` ×5, `/locations/[city]/dental-marketing`, `/case-studies/[slug]`, `/insights/[slug]`, `/sample-dental-audit`), and rendering strategy (static/ISR for content, dynamic for personalized/admin pages — extending the pattern already used correctly today).

## 3. Target-City Plan

**Confirmed: Chicago, IL.** Full requirements checklist for what must exist before `/locations/chicago-il/dental-marketing` can publish (real Google Places/DataForSEO data, aggregated real audit findings — not seeded/mock data) is in `docs/2026-content-strategy.md`. The page cannot honestly ship until either real audit volume exists for Chicago or it's framed as methodology-only (recommended interim version) rather than claiming market data that doesn't exist yet.

## 4. Content Pillars

Six pillars defined in `docs/2026-content-strategy.md`, each checked against real keyword data:
- Pillar 1 (Local Visibility) — strongest near-term SEO opportunity, low-difficulty/high-volume real keywords already found.
- Pillar 2 (GBP) and Pillar 4 (Reviews) — flagged as needing a fresh, better-targeted DataForSEO pull before article titles are finalized (existing data is thin/off-target for these two).
- Pillar 3 (Website Conversion) — real keyword support, mapped to `/services/dental-website-conversion`.
- Pillar 5 (AI Search Visibility) — explicitly a positioning play, not a volume play (only one thin keyword data point); directly targets a real gap found in the competitor scan.
- Pillar 6 (Original Market Research) — the strongest long-term asset, but blocked on real (non-mock) audit data existing first.

## 5. Pages Created

**None.** Per the brief's explicit instruction not to implement pages in this phase. Full recommended architecture is documented and ready to build once the target-city data dependency (§3) and the content model (§6) exist.

## 6. Case-Study System

`docs/case-study-system.md` — proposed `CaseStudy` Prisma model (not yet migrated), 8-status workflow, page template, and — most importantly — a **structural anti-fabrication rule**: the publish transition must be rejected server-side unless permission/anonymization, evidence files, evidence sources, a non-empty limitations field, and at least one genuinely-changed metric are all present. Also identifies that the agency's own recent UI/UX redesign is a real, publishable "transparent build case study" available today, with no client data dependency — the most concrete quick-win in the whole plan.

## 7. Backlink Strategy

Ethical, manual-review-first, documented in `docs/2026-content-strategy.md`'s "Backlink & Authority Strategy" section: original market research and the internal-redesign case study ranked as the two nearest-term assets; an outreach tracker data model is specified in `docs/admin-workflow-plan.md` rather than duplicated.

## 8. Next.js SEO Changes

None implemented this phase (planning only). Documented for the next phase: per-route `generateMetadata`, `BreadcrumbList`/`Service`/`Article` JSON-LD once those page types exist, ISR + on-demand `revalidatePath` triggered from the content-publish admin action.

## 9. Admin UX Changes

None implemented this phase. `docs/admin-workflow-plan.md` specifies: add "Content" to primary nav, promote Campaigns to a first-class nav item, a 5-step campaign wizard (replacing today's single-step fake-data form) with an expanded campaign status machine, additional Overview work-queue cards (most blocked on upstream integrations that don't exist yet), and a new automation control centre that reads live BullMQ queue state without exposing queue internals to normal admin users.

## 10. Automation Ownership

`docs/n8n-decision-plan.md` — Next.js/BullMQ owns all persistence, scoring, PDF generation, suppression enforcement, and admin approval, full stop. n8n (confirmed separately deployed, connection details pending) owns Calendar/Meet event creation, salesperson notifications, and optionally Sheets/CRM sync. **Email sequence ownership is confirmed as Option A**: BullMQ owns all scheduling and stop-condition logic; n8n is only ever the send executor, never the scheduler — chosen specifically because suppression/consent enforcement stays inside the one system that already owns those tables.

## 11. n8n Workflows

None implemented — correctly blocked on real n8n connection details (webhook URL, auth secret), which have not been provided yet. Target architecture and workflow-by-workflow ownership are fully documented in `docs/n8n-decision-plan.md`, ready to wire in once those details arrive.

## 12. Analytics Event Dictionary

`docs/analytics-measurement-plan.md` — full website-funnel (13 events) and outbound-funnel (15 events) dictionaries, each with an explicit safe-properties allowlist designed to make it structurally hard to accidentally log PII (the tracking function's own type signature restricts `properties` to primitives from a per-event allowlist, not an arbitrary object).

## 13. GA4 Mapping

Six internal events mapped to GA4's recommended lead-lifecycle events (`generate_lead`, `qualify_lead`, `disqualify_lead`, `working_lead`, `close_convert_lead`, `close_unconvert_lead`) — table in `docs/analytics-measurement-plan.md`.

## 14. Rendering and Caching Strategy

Documented in both `docs/seo-content-admin-audit.md` §6 (current state — nothing to fix yet, since no dynamic-content caching exists at all today) and `docs/2026-content-strategy.md` (target: static/ISR for all content types, dynamic/uncached for `/audit/[publicToken]`, `/book-consultation`, and all `/admin/*`, matching what's already correctly true today).

## 15. Server-Load Controls

Documented as forward requirements tied to `docs/integration-audit.md`'s existing concurrency plan (audit workers at 2, PDF at 1, contact enrichment at 1–2, email at 4–8/day) — this phase didn't need to add anything new here since the integrations audit already covers it; this phase's docs cross-reference rather than duplicate it, and extend it with a note that Content/Case Study publishing should trigger `revalidatePath` rather than any full-site rebuild or crawl.

## 16. Files Created / Modified

**Created**: `docs/seo-content-admin-audit.md`, `docs/2026-content-strategy.md`, `docs/case-study-system.md`, `docs/admin-workflow-plan.md`, `docs/analytics-measurement-plan.md`, `docs/n8n-decision-plan.md`, `docs/seo-content-admin-analytics-handoff.md` (this file). All planning documents — zero application code created in this phase.

**Modified**: none in this phase. (`lib/auth.ts`, `lib/queue.ts`, `lib/env.server.ts`, `docs/integration-audit.md`, `.env.example`, and `.env` were touched in the *adjacent* integrations-audit phase that immediately preceded this one, not as part of this SEO/content/admin/analytics work — see that phase's own reporting for details. No further code changes were made while producing these six documents.)

## 17. TypeScript Result

`npx tsc --noEmit` — clean, zero errors (unchanged from the integrations-phase baseline, since no code changed in this pass).

## 18. ESLint Result

`npx eslint .` — 6 problems (4 errors, 2 warnings), identical to the confirmed pre-existing baseline established in the integrations-phase report (originally verified against a `git stash` of the pre-redesign codebase, which had 46 problems). **Zero new lint errors** — expected, since this phase added only markdown files.

## 19. Build Result

`npx next build` — succeeded. Compiled in 3.0s, TypeScript pass in 4.3s, all 31 routes generated with no errors.

## 20. Manual Testing Required

- No test framework exists in this repo yet (`package.json` has no `jest`/`vitest`/`playwright`, no `test` script) — noted in the integrations audit and still true; not addressed in this planning-only phase.
- Confirm the `/locations/chicago-il/dental-marketing` slug format (with or without a state suffix) before that route is built.
- Once n8n connection details are available, verify the webhook auth pattern lines up with `WEBHOOK_SECRET` as designed in `docs/integration-audit.md` §17.
- Review all six planning documents for business-strategy fit (competitor positioning, pillar prioritization, case-study framing) — these are content/strategy decisions, not just technical ones, and deserve a human pass before implementation starts.

## 21. Recommended Next Phase

Given the acceptance criteria are explicitly "plan exists," not "plan implemented," the natural next steps — each substantial enough to warrant its own checkpoint, matching how the adjacent integrations phase is already being sequenced one integration at a time — are, roughly in dependency order:

1. Implement the `CaseStudy` model + publish the internal-redesign case study (`docs/case-study-system.md` §"When No Verified Case Study Exists Yet" item 1) — no external dependency, available now.
2. Build `/services/*` (5 pages) using the existing keyword research — no external dependency beyond the content itself.
3. Wire the first real provider integration (per the paused integrations-phase plan — Google Places is the natural starting point, being the most foundational and cheapest to verify) so Chicago audit data can start accumulating toward a genuine `/locations/chicago-il/dental-marketing` page.
4. Stand up the analytics abstraction (`docs/analytics-measurement-plan.md`) early, even before GA4 is live, so events start accumulating from day one of whichever feature ships next.
5. Campaign wizard and automation control centre — reasonably deferred until real provider integrations exist to orchestrate, since building the UI first would just be scaffolding around mock data.

I'd recommend confirming step order with you before starting any of them, consistent with how we've been sequencing the integrations work.
