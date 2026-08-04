# Manual Test Checklist

All items verified live in this session against live PostgreSQL and Redis containers with worker background daemon processing.

## Environment & Secrets
- [x] `.env` loads without error — **Pass**
- [x] `.env.example` current with required keys — **Pass**
- [x] No secret values committed in git diff — **Pass**

## Database & Schema
- [x] PostgreSQL container reachable on port 5435 — **Pass**
- [x] `npx prisma db push` / Prisma migration clean — **Pass**
- [x] Production index fields active — **Pass**

## Redis & Worker Infrastructure
- [x] Redis container reachable on port 6375 — **Pass**
- [x] `npx tsx dental-worker.ts` starts and processes jobs cleanly — **Pass**
- [x] Worker consumes discovery, analysis, PDF generation, and outreach jobs — **Pass**
- [x] Idempotency & job duplication protection active — **Pass**

## Campaign & Lead Pipeline
- [x] 5-Step Campaign Wizard creates campaigns in `DRAFT` state — **Pass**
- [x] `POST /api/admin/campaigns/[id]/start` triggers BullMQ `discoveryQueue` — **Pass**
- [x] Discovery provider (`TEST_PROVIDER`, `GOOGLE_PLACES`, `DATAFORSEO`) executes — **Pass**
- [x] Business records created with `normalizedName`, `normalizedDomain`, and `googlePlaceId` — **Pass**
- [x] Multi-pass deduplication prevents duplicate business entry — **Pass**
- [x] Decision maker contacts automatically generated — **Pass**

## Audit Engine & PDF Generation
- [x] Credential-free website analyzer checks SSL, latency, and viewport tags — **Pass**
- [x] Centralized `computeAuditScores` generates category scores (0-100) — **Pass**
- [x] PDF generator (`lib/pdfGenerator.ts`) creates 2-page branded executive report — **Pass**
- [x] `GET /api/audit/[publicToken]/pdf` downloads PDF report — **Pass**
- [x] Audit statuses transition `PENDING` → `RUNNING` → `COMPLETED` — **Pass**

## Engagement, Outreach & Appointments
- [x] `logEngagementEvent` records events in `EngagementEvent` table — **Pass**
- [x] Email transport (`lib/email.server.ts`) supports `EMAIL_SEND_MODE=test` — **Pass**
- [x] Online 15-minute consultation creates `REQUESTED` appointment — **Pass**
- [x] Offline in-person practice visit creates `REQUESTED` appointment — **Pass**
- [x] Admin approval (`PATCH /api/admin/appointments/[id]`) updates to `SCHEDULED` & `CONVERTED` — **Pass**

## Integration Dashboard & Quality Gates
- [x] `/admin/integrations` status matrix displays real-time system health — **Pass**
- [x] Safe 1-lead pipeline test button triggers end-to-end flow — **Pass**
- [x] TypeScript compiler (`npx tsc --noEmit`) passes with 0 errors — **Pass**
- [x] ESLint (`npm run lint`) passes with 0 errors and 0 warnings — **Pass**
