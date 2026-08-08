# Integration Audit

Audit date: 2026-08-04. Scope: every third-party integration and background-processing path required for the lead-generation → audit → email → appointment funnel described in the integrations brief.

**No real secret values appear in this document.** Where a credential's presence was checked, only its variable name and status are recorded.

## Summary Table

| Integration | Status | Notes |
|---|---|---|
| PostgreSQL (Prisma) | **Partially implemented** | Schema is complete and well-modeled (13 models covering the whole funnel). Client is a plain singleton, no pooling config, no graceful shutdown hook. |
| Redis | **Partially implemented** | `ioredis` client instantiated in two places independently (`lib/queue.ts`, `dental-worker.ts`) with no shared config, no retry/backoff tuning. |
| BullMQ queues/workers | **Disconnected** | 3 queues exist (`discovery-queue`, `analysis-queue`, `outreach-queue`), not the 9 required. **`lib/queue.ts` is imported nowhere in the app** — no route handler ever calls `.add()`. The worker process would sit idle forever even if run, because nothing enqueues jobs. `dental-worker.ts` is not started by any npm script or Docker service. |
| Google Places | **Missing** | `GOOGLE_PLACES_API_KEY` exists in `.env` but is referenced in zero source files. No client, no normalization, no dedupe. |
| DataForSEO | **Missing** | `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD`/`DATAFORSEO_BASE_URL` exist in `.env` but are referenced in zero source files. Note: the current `DATAFORSEO_LOGIN` value in `.env` is itself already a base64 string, not a raw login — see Security Findings. |
| Apollo | **Missing** | `APOLLO_API_KEY` exists in `.env`, referenced nowhere. No client, no contact model population beyond hardcoded fake contacts (see below). |
| OpenAI | **Missing** | `OPENAI_API_KEY` exists in `.env`, referenced nowhere. All audit "AI-rewritten" copy (`AuditResult.detailsJson`) is hand-written template literals with deterministic scores, not model output. |
| Gmail / Google Workspace email | **Missing** | No email-sending library in `package.json` (no `nodemailer`, `googleapis`, `resend`, etc). `EmailMessage` rows are created with `status: "QUEUED"` by `app/api/admin/businesses/[id]/outreach/route.ts` and then **never transition** — no code ever sets them to `SENT`. The one place that *would* send (`dental-worker.ts`'s `send-email` job) can never run because nothing enqueues that job. |
| Google Calendar / Meet | **Mocked** | `book-meeting` route creates an `Appointment` row and returns a **hardcoded literal string** `"https://meet.google.com/xyz-pdq-abc"` as the join URL, identical for every booking. No OAuth, no Calendar API call, no real availability check. |
| PDF generation | **Missing** | No PDF library in `package.json`. `Appointment.salesBriefingUrl` field exists in the schema but is never written. No storage integration (local or R2) exists. |
| Cloudflare R2 | **Missing** | No SDK, no env vars, no code. |
| Admin settings / integrations status | **Fully mocked** | `app/admin/settings/page.tsx` (pre-redesign and post-redesign) has a form with a scraper-delay and SMTP-host field; submitting only sets a local `success` boolean for 3 seconds — **it never calls an API, never persists anything, and shows no integration status of any kind.** |
| Health-check endpoints | **Missing** | No `/api/health` or equivalent route exists anywhere in `app/api/`. |
| Webhook handlers | **Missing** | No webhook receiver exists (no inbound-email-reply, no calendar-push, no unsubscribe-provider-webhook). |
| Environment validation | **Missing** | Every file reads `process.env.X` directly and inline (`lib/auth.ts`, `lib/queue.ts`, `dental-worker.ts`, route handlers). Two of these have **insecure silent fallbacks**: `lib/auth.ts` falls back to a hardcoded `"fallback_secret_for_local_development"` JWT secret if `JWT_SECRET` is unset, and `lib/queue.ts`/`dental-worker.ts` fall back to `redis://localhost:6379` if `REDIS_URL` is unset. No zod (or other) schema validates env at startup; a missing critical variable fails silently or with a confusing downstream error instead of a clear boot-time message. |
| Client-side credential exposure | **None found** | No `NEXT_PUBLIC_`-prefixed secret-like variable exists. No provider key is referenced in any `"use client"` file. This is a genuine pass. |

## What Actually Happens Today (the "funnel" is fully simulated)

Tracing the real code path confirms every number in the product is fabricated at request time, not computed from any external signal:

- **Discovery**: `POST /api/admin/campaigns` hardcodes 3 fake business names/websites per city (`{city} Dental Care Group`, `Apex Family Dentistry`, `Downtown Dental Studio`) directly in the route handler. `dental-worker.ts`'s discovery worker does the identical thing — but is never triggered.
- **Website/local audits**: `POST /api/audit/unlock-lead` and `POST /api/admin/businesses/[id]/audit` both write **fixed constant scores** (e.g. `localVisibilityScore = 15`, `websiteQualityScore = 12`, competitor names like `"${city} Family Dentistry"`, rank `1`, `mapScore: 92`) — the "opportunity score" is the same every time regardless of the real website or city submitted, aside from string interpolation of the city name into copy.
- **Contact enrichment**: `POST /api/admin/businesses/[id]/outreach` fabricates a contact (`firstName: "Sarah", lastName: "Jenkins", email: dr.sarah.jenkins@<domain>, role: "Practice Owner"`) if none exists — this is not Apollo, it's a literal hardcoded name.
- **Email send**: creates a `QUEUED` `EmailMessage` row and stops. No email is ever transmitted by any code path currently reachable from the app.
- **Calendar/Meet**: returns a hardcoded Meet URL string; no real event is created anywhere.
- **PDF**: does not exist.

This means the "audit" and "outreach" experience is a fully deterministic demo — functionally solid for the UI/UX work done in the prior phase, but there is no real integration layer to "verify" yet; nearly everything in sections 7–13 of the brief is new-build, not audit-and-fix.

## Security Findings

1. **Real-looking, live API keys are sitting in plaintext in `.env`** on this machine: `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `APOLLO_API_KEY`, `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD`.
   - `.env` is correctly listed in `.gitignore` (`.env*` pattern) and `git log --all --full-history -- .env` returns nothing — **these values have never been committed to this repository's git history.** That part is clean.
   - However, per your own instruction ("previously shared credentials must be considered exposed"), these should be treated as compromised regardless of git status and **rotated before any real use.** I have not used, tested, or reproduced these values anywhere, including in this document.
   - The stored `DATAFORSEO_LOGIN` value is itself already a base64-encoded string (decodes to an `email:token`-shaped pair), not a raw login — this is inconsistent with how the brief specifies it should be used (raw `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD`, combined into base64 **at runtime**). This value should not be reused even after rotation; a fresh raw login/password pair is needed.
2. **Weak/hardcoded fallback secrets**: `lib/auth.ts` silently uses a hardcoded JWT secret if `JWT_SECRET` is missing from the environment. This is a real vulnerability in any environment where `.env` fails to load — the app would keep running with a publicly-known signing secret instead of failing loudly.
3. **Hardcoded default admin credentials in a client component**: pre-redesign, `app/admin/login/page.tsx` pre-filled the login form's `email`/`password` state with real-looking default values (`admin@smileaimarketing.com` / `admin123`). This was already fixed in the prior UI/UX phase (defaults cleared, proper `autoComplete` added) — noting it here since it's adjacent to this audit's concerns.
4. No other secret-shaped strings were found anywhere else in the repository (`grep` across `.ts/.tsx/.js/.json/.md/.yml` for API-key-shaped patterns, excluding `.env` itself and `node_modules`, returned nothing).

## Docker / Networking

- `docker-compose.yml` provisions **only** `postgres` and `redis` — there is no `web` or `worker` service, and **no `Dockerfile` exists anywhere in the repo.** The app and the worker both currently only run directly on the host.
- Both infra services publish to non-default host ports (`5435→5432` for Postgres, `6375→6379` for Redis) and `.env`'s `DATABASE_URL`/`REDIS_URL` correctly target `localhost` at those published ports — appropriate for "Next.js running directly on the host," which is the only mode that currently exists.
- Neither service has a Compose `healthcheck:` block.
- Section 4 of the brief ("confirm connectivity from both web container and worker container," "use internal service names") is not yet applicable until `web`/`worker` services and a `Dockerfile` are added — this audit flags it as new infrastructure work, not a fix to something broken.

## Environment Variables: Present vs. Required

Present in `.env` today: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `APOLLO_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_BASE_URL`.

Missing entirely (needed for the brief's scope): `NODE_ENV`, `APP_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`, `EMAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO`, `ADMIN_EMAIL`, `SALES_NOTIFICATION_EMAIL`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`, `CRON_SECRET`, `WEBHOOK_SECRET`, `OUTREACH_DAILY_LIMIT`, `OUTREACH_MIN_DELAY_MINUTES`, `OUTREACH_MAX_DELAY_MINUTES`, `EMAIL_SEND_MODE`, all four `CLOUDFLARE_R2_*` variables. No `.env.example` file existed before this audit.

## Conclusion / Scope Reality Check

Sections 1–3 of the integration brief (audit, `.env.example`, typed env module) are addressed by this document and the two files created alongside it. Sections 4 onward (8 real provider clients, 9-queue BullMQ rebuild with idempotency/backoff, Docker web+worker services, Calendar/Gmail OAuth flows, PDF+R2 pipeline, admin integration-status page, and a mocked-provider test suite) represent substantial new engineering — realistically several distinct workstreams — none of which can be *verified end-to-end* without real, newly-rotated credentials for OpenAI, Google Places, DataForSEO, Apollo, and a Google Workspace account, none of which I have access to or can generate. See the chat response for how I'd recommend sequencing the remaining work.
