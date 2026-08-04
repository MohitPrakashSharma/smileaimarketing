# Manual Test Checklist

Items already verified live in this session are pre-checked with their actual result recorded. Everything else is left blank for the next manual test pass. Update the **Actual Result** and **Pass/Fail** columns as you go — don't just check the box.

## Environment

- [x] `.env` loads without error — **Actual**: app boots, `lib/env.server.ts` validation passes — **Pass**
- [ ] `.env.example` is current and has no real secrets — **Actual**: _____ — Pass/Fail
- [ ] No secret values appear in `git diff` before any commit — **Actual**: _____ — Pass/Fail

## Database

- [x] PostgreSQL container reachable — **Actual**: `smileai-postgres` up, port 5435, confirmed via `\dt` — **Pass**
- [x] `npx prisma migrate status` is clean — **Actual**: "Database schema is up to date!", 4 migrations applied — **Pass**
- [x] Existing data untouched by migrations — **Actual**: Business/Audit/Appointment row counts identical before/after every migration in this session — **Pass**
- [ ] `npx prisma db seed` / admin user exists — **Actual**: _____ — Pass/Fail

## Redis / Worker

- [x] Redis container reachable — **Actual**: `PING` → `PONG` via ioredis — **Pass**
- [ ] `npm run worker` starts successfully — **Actual**: _____ (known issue: script points at `dental-worker.js`, which doesn't exist yet — expect this to fail until resolved) — Pass/Fail
- [ ] Worker consumes a test job from any queue — **Actual**: _____ — Pass/Fail
- [ ] Graceful shutdown (`SIGTERM`) closes workers cleanly — **Actual**: _____ — Pass/Fail

## Campaign

- [ ] Create a campaign (name, city, category) — **Actual**: _____ — Pass/Fail
- [ ] Campaign appears in `/admin/campaigns` list — **Actual**: _____ — Pass/Fail
- [x] Campaign detail page loads with real counts — **Actual**: verified against existing "Mandi Inbound Leads" campaign — discovered/audited/contacted/converted counts all correct — **Pass**
- [ ] Duplicate campaign for the same city doesn't crash on repeat business creation — **Actual**: _____ (this session added `skipDuplicates: true` specifically to fix this — untested against a live repeat) — Pass/Fail

## Business Discovery

- [ ] Discovery returns real businesses (requires Google Places/DataForSEO credentials — currently BLOCKED) — **Actual**: _____ — Pass/Fail
- [ ] Discovered businesses are deduplicated by Place ID / domain / name+city — **Actual**: _____ — Pass/Fail
- [ ] Businesses persist in Postgres with normalized fields populated — **Actual**: verified for self-serve audit intake (`normalizedDomain`/`normalizedName` populated on create) — **Pass** for the self-serve path; campaign-seed path untested live this round

## Audit

- [x] Website check reflects real reachability — **Actual**: tested against both an unreachable demo domain (correctly scored 4/20, honest failure) and a real live site (`example.com` — 200, SSL valid, viewport detected) — **Pass**
- [ ] Local visibility / competitor scores (still mocked — confirm they're clearly not presented as real) — **Actual**: _____ — Pass/Fail
- [x] Admin can open a business and see real saved audit data — **Actual**: `/admin/businesses/[id]` shows real score breakdown by category — **Pass**
- [ ] Audit status transitions correctly (queued → ... → ready/partial/failed) — **Actual**: _____ (current `AuditStatus` enum is coarser than the brief's full list — PENDING/RUNNING/COMPLETED/FAILED only) — Pass/Fail

## PDF

- [ ] PDF generation (not built this pass — expect N/A/Fail until implemented) — **Actual**: _____ — Pass/Fail
- [ ] PDF download — **Actual**: _____ — Pass/Fail
- [ ] PDF belongs to the correct business/audit — **Actual**: _____ — Pass/Fail

## Public Report

- [x] Invalid token shows a safe error, no stack trace/internal IDs — **Actual**: `AuditReportClient.tsx` error state confirmed in earlier UI testing — **Pass**
- [x] Report view is recorded — **Actual**: `viewCount` incremented live, confirmed via DB read — **Pass**
- [ ] PDF download recorded (N/A until PDF exists) — **Actual**: _____ — Pass/Fail
- [x] Booking actions preserve the audit/business relationship — **Actual**: request-visit correctly linked the new appointment to the existing business/contact — **Pass**

## Contact

- [ ] Apollo enrichment (BLOCKED BY CREDENTIALS) — **Actual**: _____ — Pass/Fail
- [ ] Manual contact entry — **Actual**: _____ — Pass/Fail
- [x] Contact linked to business/campaign/audit correctly — **Actual**: confirmed on `/admin/businesses/[id]` — contacts render correctly for the linked business — **Pass**

## Email

- [ ] Test-mode email redirect (not built — BLOCKED BY CREDENTIALS) — **Actual**: _____ — Pass/Fail
- [ ] No real lead receives an email in test mode — **Actual**: _____ — Pass/Fail
- [ ] Follow-ups stop on reply/booking/unsubscribe/do-not-contact — **Actual**: _____ — Pass/Fail

## Appointment

- [x] Online booking creates a real `Appointment` row — **Actual**: confirmed via existing DB data (5+ appointments) — **Pass**
- [x] In-person request is created as `REQUESTED`, not confirmed — **Actual**: verified live — appointment created with `status: "REQUESTED"`, business status unchanged — **Pass**
- [x] Admin can approve an in-person request with a real date/time — **Actual**: verified live — approve sets `SCHEDULED` + business `CONVERTED` — **Pass**
- [x] Admin can reject an in-person request — **Actual**: route tested for the correct state transition logic (`CANCELLED`); not re-tested via the UI button specifically this round — **Pass** (API-level)
- [x] Double-approval is rejected — **Actual**: `409` confirmed live — **Pass**
- [ ] Calendar/Meet integration on approval (BLOCKED BY CREDENTIALS) — **Actual**: _____ — Pass/Fail

## Admin

- [x] Login works — **Actual**: verified live — **Pass**
- [x] Overview reflects real data — **Actual**: stat tiles and queues updated correctly after test actions — **Pass**
- [x] Business detail page — **Actual**: verified live — **Pass**
- [x] Campaign detail page — **Actual**: verified live — **Pass**
- [ ] Audit review detail (still list-only — PARTIAL) — **Actual**: _____ — Pass/Fail
- [ ] Pipeline "next recommended action" (not built) — **Actual**: _____ — Pass/Fail

## Analytics

- [ ] Analytics events recorded (not built this pass) — **Actual**: _____ — Pass/Fail
- [ ] No PII in analytics events — **Actual**: _____ — Pass/Fail

## Security

- [x] Admin routes require authentication — **Actual**: unauthenticated `PATCH /api/admin/appointments/[id]` correctly returned `401` — **Pass**
- [x] Raw provider payloads not exposed via admin API — **Actual**: `rawProviderRef` deliberately excluded from `/api/admin/businesses/[id]` response — **Pass**
- [ ] No secret present in Git history — **Actual**: confirmed for `.env` specifically in `docs/integration-audit.md` (never committed) — re-verify for any new files before pushing — Pass/Fail

## Docker Deployment

- [x] `docker compose config` validates — **Actual**: valid, one harmless warning — **Pass**
- [ ] Web container builds and runs (no `Dockerfile` exists yet) — **Actual**: _____ — Pass/Fail
- [ ] Worker container builds and runs (no `Dockerfile` exists yet) — **Actual**: _____ — Pass/Fail
- [ ] Web/worker connect to Postgres/Redis via internal service names, not `localhost` — **Actual**: _____ — Pass/Fail
