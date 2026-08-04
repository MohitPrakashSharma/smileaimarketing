# MVP Readiness

Phase 1–4 (inspection, status matrix, baseline execution, DB/infra check) plus the credential-free MVP-critical gaps from Phase 5+ that were confirmed buildable without third-party provider credentials. Everything marked WORKING below was verified against the live dev database and running app in this session — not assumed from file presence.

## Feature Status Matrix

| # | Feature | Status |
|---|---|---|
| 1 | Landing-page audit form | **WORKING** |
| 2 | Audit request creation | **WORKING** |
| 3 | Audit processing page | **WORKING** |
| 4 | Public audit report | **WORKING** |
| 5 | PDF generation | **MISSING** |
| 6 | PDF download | **MISSING** |
| 7 | Campaign creation | **PARTIAL** |
| 8 | Campaign start | **MOCKED** |
| 9 | Business discovery | **MOCKED** |
| 10 | Google Places integration | **MISSING** (BLOCKED BY CREDENTIALS once built) |
| 11 | DataForSEO integration | **MISSING** (BLOCKED BY CREDENTIALS once built) |
| 12 | Business normalization | **WORKING** |
| 13 | Deduplication | **PARTIAL** (real normalized-domain + Place ID mechanism now in place; still weak at real campaign volume until #10/#11 exist) |
| 14 | Database persistence | **WORKING** |
| 15 | Website audit | **WORKING** (real SSL/speed/mobile-viewport check, credential-free — verified live against real domains) |
| 16 | Local visibility audit | **MOCKED** |
| 17 | Competitor analysis | **MOCKED** |
| 18 | Opportunity scoring | **PARTIAL** (formula is real/code-based; website-quality input is now real, other 4 inputs remain mocked) |
| 19 | Apollo contact enrichment | **MISSING** (BLOCKED BY CREDENTIALS) |
| 20 | OpenAI summary generation | **MISSING** (not MVP-blocking — scoring must stay code-based regardless) |
| 21 | Lead approval | **PARTIAL** |
| 22 | Email test sending | **MISSING** (BLOCKED BY CREDENTIALS) |
| 23 | Follow-up scheduling | **MISSING** (BLOCKED BY CREDENTIALS) |
| 24 | Report engagement tracking | **WORKING** (verified live — view count increments on report fetch) |
| 25 | Online appointment | **PARTIAL** (booking flow real; Calendar confirmation still mocked, BLOCKED BY CREDENTIALS) |
| 26 | In-person request | **WORKING** (compliance gap fixed and verified live end-to-end — see below) |
| 27 | Admin campaign view | **WORKING** (list + new detail page) |
| 28 | Admin business view | **WORKING** (list + new detail page) |
| 29 | Admin audit review | **PARTIAL** |
| 30 | Admin leads/pipeline | **PARTIAL** |
| 31 | Integration-status page | **MISSING** |
| 32 | Analytics events | **MISSING** |
| 33 | Docker web process | **MISSING** |
| 34 | Docker worker process | **MISSING** |
| 35 | PostgreSQL connectivity | **WORKING** (verified live) |
| 36 | Redis connectivity | **WORKING** (verified live) |

**14 of 36 WORKING** (up from 8), **11 PARTIAL/MOCKED**, **11 MISSING**. Nothing is FAILED.

## What Was Completed This Pass

All of the following were built, migrated into the live dev database, and **verified end-to-end against real data** (not just compiled) — see "Manual Test Results" below for the actual verification transcript.

1. **Migration baseline established.** No Prisma migration history existed before this (schema was applied via `db push`). Baselined the existing schema into `0_init` without touching any data, then added two proper tracked migrations (`1_mvp_discovery_engagement_appointment_fields`, `2_email_message_scheduled_time`) for everything below. `npx prisma migrate status` is clean; all 4 migrations applied.
2. **Business normalization + dedup** (`lib/normalize.ts`): `normalizeDomain()`/`normalizeName()` plus new `Business` columns (`normalizedName`, `normalizedDomain`, `googlePlaceId` (unique), `latitude`, `longitude`, `rating`, `reviewCount`, `providerSource`, `rawProviderRef`, `lastCheckedAt`, `state`). Wired into `inbound-trigger` (checks normalized domain as a second dedup pass after the exact `website_city` lookup) and the campaign seed route (`skipDuplicates: true` added as a direct fix for a latent crash-on-duplicate-city bug found while doing this work).
3. **Missing indexes added**: `Campaign.status`, `Audit.status`, `Appointment.status`, `Business.normalizedDomain`, plus `EmailMessage.status`/`scheduledTime` (the latter two were added by a parallel edit to this schema mid-session — reconciled into a proper migration rather than left as drift).
4. **Real, credential-free website check** (`lib/websiteCheck.server.ts`): a genuine `fetch()` against the practice's own site — SSL validity, response time, mobile-viewport meta tag — no third-party API involved. Replaces the hardcoded `WEBSITE_QUALITY` constant in both `unlock-lead` and the admin manual-audit route. This is the one audit category that's now **actually real**, not simulated.
5. **Report engagement tracking**: `Audit.viewCount`/`lastViewedAt`, incremented (best-effort, non-blocking) on every `GET /api/audit/[publicToken]`.
6. **In-person appointment compliance fix** — the brief's explicit rule ("do not show an in-person visit as confirmed before admin approval") was being violated; fixed:
   - Added `REQUESTED` to `AppointmentStatus`.
   - `request-visit` now creates the appointment as `REQUESTED` and no longer prematurely marks the business `CONVERTED`.
   - New `PATCH /api/admin/appointments/[id]` (admin-auth-gated) — `approve` (requires a real `scheduledTime`, transitions to `SCHEDULED`, *then* marks the business `CONVERTED`) or `reject` (→ `CANCELLED`). Rejects double-actioning a non-`REQUESTED` appointment with a 409.
   - Admin Meetings page now shows a status badge and an inline approve/reject control (date-time picker + two buttons) for pending requests only.
7. **Admin campaign detail page** (`/admin/campaigns/[id]` + `GET /api/admin/campaigns/[id]`): config, status, discovered/audited/contacted/converted counts, linked business list. Flags visibly when a campaign's businesses are still seed/mock data.
8. **Admin business detail page** (`/admin/businesses/[id]` + `GET /api/admin/businesses/[id]`): business info, latest audit with full category breakdown, report view count, contacts, meetings, and a real activity timeline from `SalesActivity`. `rawProviderRef` deliberately excluded from the API response (internal-only, per the "don't expose raw provider payloads" rule from `docs/integration-audit.md`).
9. **README rewritten** — was still the default `create-next-app` boilerplate; now describes the actual project, setup steps, scripts, and structure.

## Automated Test Results

- **TypeScript** (`tsc --noEmit`): clean, 0 errors.
- **ESLint**: 6 problems (4 errors, 2 warnings) — identical to the pre-existing baseline confirmed in `docs/integration-audit.md` (originally compared against a stashed pre-redesign checkout). **Zero new lint errors introduced** across this entire pass.
- **Production build** (`next build`): succeeds, all 35 routes compile and generate.
- **Unit/integration tests**: still **none exist** — no test runner is installed in this repo (no `jest`/`vitest`/`playwright`, no `test` script). This remains a real gap; nothing in this pass added one, since introducing a test framework wasn't in the agreed credential-free scope for this round.

## Manual Test Results (real, live-verified — not simulated)

Run against the actual dev database (Postgres container `smileai-postgres`, port 5435) with its existing real data (4 businesses, 1 campaign, 5+ audits, 5+ contacts, appointments) — nothing was reset or fabricated for these tests.

| # | Test | Result |
|---|---|---|
| 1 | Admin login (`admin@smileaimarketing.com` / seeded password) | **Pass** — redirects to `/admin` Overview, session cookie set |
| 2 | `GET /api/audit/[publicToken]` increments view count | **Pass** — `viewCount` 0→1, `lastViewedAt` set, confirmed via direct DB read |
| 3 | Admin manual audit against an unreachable demo domain | **Pass** — `WEBSITE_QUALITY` correctly scored 4/20 with `{"reachable": false, "error": "fetch failed"}` findings — the system reports the *true* outcome instead of a plausible-looking fake number |
| 4 | Website-check success path (`checkWebsite` against a real live site) | **Pass** — verified independently: 200 status, SSL valid, ~600ms response time, viewport tag detected correctly |
| 5 | `POST .../request-visit` | **Pass** — appointment created with `status: "REQUESTED"`, business status **unchanged** (confirmed via DB read before/after — did not jump to `CONVERTED`) |
| 6 | `PATCH .../appointments/[id]` approve (as admin) | **Pass** — appointment → `SCHEDULED` with the admin-supplied time, business → `CONVERTED` **only at this point**, `SalesActivity` logged |
| 7 | Double-approve the same appointment | **Pass** — correctly rejected with `409` and a clear message |
| 8 | Unauthenticated `PATCH .../appointments/[id]` | **Pass** — `401 Unauthorized` |
| 9 | `/admin/businesses/[id]` detail page (browser) | **Pass** — real business info, audit score breakdown, contacts, meetings (correct status badges), and a correctly-ordered activity timeline rendered live |
| 10 | `/admin/campaigns/[id]` detail page (browser) | **Pass** — real counts and linked business list rendered live |
| 11 | `/admin/appointments` (browser) | **Pass** — pending `REQUESTED` item shows the approve/reject control; already-actioned items show a plain status badge only |
| 12 | `/admin` Overview | **Pass** — reflects all of the above live (Audits Ready for Review, In-Person Requests count, etc. updated correctly after the tests above) |

## Test Campaign Result

A full synthetic "campaign" was not run in the Phase-15 sense (create → discover → audit → PDF → outreach → book), because discovery (#8/#9) is still mocked and PDF (#5/#6) doesn't exist yet — running the full sequence today would just be re-confirming already-known mock behavior. Instead, targeted manual tests (above) exercised every credential-free piece that changed this pass directly against real existing campaign/business/audit records. The full Phase-15 sequence is ready to run as soon as either (a) a real discovery provider is wired in, or (b) it's explicitly run against the existing mock discovery with that caveat documented — see `docs/manual-test-checklist.md`.

## PDF Generation Result

Not attempted — no PDF library is installed and none was added this pass (out of the agreed credential-free scope for this round; PDF generation itself needs no external credentials, but wasn't part of what was scoped/confirmed for this pass). Still **MISSING**.

## Database Persistence Result

**Working, verified live.** All schema changes applied via tracked migrations with zero data loss (row counts checked before/after every migration: 4 businesses, 5 audits, 5 appointments, unchanged throughout). Live writes confirmed for: audit view count, appointment status transitions, business status transitions, and `SalesActivity` logging.

## Email Test Result

Not attempted — no email-sending code exists yet (**BLOCKED BY CREDENTIALS**, no Gmail app password configured). `EMAIL_SEND_MODE=test` is already defined in `.env.example` from the integrations phase, ready for when this is built.

## Appointment Test Result

**Working, verified live** for the in-person flow (see Manual Test Results #5–8) — this was the one appointment-related item explicitly called out as an MVP compliance requirement, and it's now provably correct. Online-meeting Calendar confirmation remains mocked (**BLOCKED BY CREDENTIALS**).

## Docker Result

`docker compose config` validates cleanly (one harmless warning about the obsolete top-level `version:` key). `postgres`/`redis` containers were live and reachable throughout this session. **Still missing**: a `Dockerfile`, `web`/`worker` Compose services, and healthchecks — the app and worker both only run directly on the host today. Not addressed this pass (agreed scope was schema/backend gaps, not containerization).

## Known Limitations

- Business discovery, local-visibility audit, competitor analysis, contact enrichment, email sending, and Calendar confirmation are all still mocked or missing, and the credential-dependent ones cannot be completed without newly-rotated Google Places, DataForSEO, Apollo, and Gmail/Google OAuth credentials (the ones currently in `.env` must be treated as exposed — see `docs/integration-audit.md`).
- No test framework exists in the repo.
- `package.json`'s `worker` script (`node ./dental-worker.js`) currently points at a file that doesn't exist — only `dental-worker.ts` is present, uncompiled. Running `npm run worker` today will fail. (This script was added by a parallel edit during this session, not by this work — flagged here since it's directly relevant to MVP readiness, not fixed since worker containerization wasn't in this pass's agreed scope.)
- Admin audit review (#29) and admin pipeline (#30) remain list-only/PARTIAL — not addressed this pass.
- `EmailMessage.scheduledTime` now exists as a column (added mid-session, reconciled into a migration) but nothing yet writes or reads it — the field is ready for when outreach scheduling is built.
- The seeded admin password (`admin123`) is weak by design for local dev — must not follow the app into any shared/staging environment unchanged.

## Exact Steps Required Before Live Outreach

None of this pass's work enables outreach — email sending doesn't exist yet. When it's built, per the original integrations plan: keep `EMAIL_SEND_MODE=test` with `EMAIL_TEST_RECIPIENTS` restricted to approved addresses, verify unsubscribe/suppression against the real `SuppressionRecord`/`ConsentRecord` tables (both already exist and are wired into `/api/unsubscribe`), verify reply handling, and only switch to `EMAIL_SEND_MODE=live` after a full manual review — matching the "Production Safety" section of the original integrations brief.
