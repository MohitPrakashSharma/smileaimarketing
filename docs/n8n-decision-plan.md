# Next.js vs. n8n — Ownership Decision Plan

Planning document. No n8n workflow is implemented as part of this document.

## Confirmed: n8n Exists, Deployed Separately

A repo-wide search found zero references to n8n anywhere in this codebase (no `docker-compose.yml` service, no `N8N_URL`/`N8N_API_KEY`/`N8N_WEBHOOK_*` variable, no webhook route for it to call). **Confirmed by the business owner: n8n is already running, deployed separately from this repo** (alongside the existing Traefik/Cloudflare setup), with connection details to be provided when the first n8n-owned workflow is actually built. Until those details arrive, no n8n-specific code (webhook calls, credential env vars) should be written — the ownership matrix below is the target architecture, not something to wire blindly ahead of having a real n8n URL/API key to point at. When ready, this will need at minimum `N8N_WEBHOOK_URL` (or per-workflow webhook URLs) and an authentication secret added to `.env.example` alongside the integration variables from `docs/integration-audit.md`.

## Source-of-Truth Boundary (not in question — this part of the brief is unambiguous)

Next.js + PostgreSQL remain the system of record for everything already modeled in `prisma/schema.prisma` plus the two systems proposed in companion docs: Businesses, Contacts, Campaigns, Audits, Reports, Appointments, Email state, Consent, Suppression, Pipeline, Content (`docs/case-study-system.md`/`docs/admin-workflow-plan.md`), Analytics attribution (`docs/analytics-measurement-plan.md`). n8n is never a data owner — at most, a workflow trigger/executor that reads from and writes back to Next.js APIs.

## Ownership Matrix

| Capability | Owner | Why |
|---|---|---|
| Business/contact/campaign/audit/appointment persistence | **Next.js/BullMQ** | Source of truth; needs transactional consistency with the rest of the schema. |
| Deterministic audit scoring | **Next.js/BullMQ** | Runs against data already in Postgres; no external orchestration benefit. |
| PDF generation | **Next.js/BullMQ** | Needs the `pdf-generation` queue's concurrency=1 constraint (`docs/integration-audit.md` §6, §13) — a shared global limit is much simpler to enforce in one BullMQ queue than to coordinate across two systems. |
| Suppression enforcement | **Next.js/BullMQ** | Must be checked synchronously before *any* send, including ones n8n might trigger — enforced once, at the Next.js email-sending boundary, regardless of which system decided to send. |
| Admin approval gate | **Next.js/BullMQ** | Lives in the admin UI, which is a Next.js app. |
| Analytics event storage | **Next.js/BullMQ** | Needs to join against internal IDs (business/audit/campaign) that only Next.js/Postgres has. |
| Google Calendar event creation | **n8n** (if connected) | Visual OAuth-flow orchestration is exactly n8n's strength; low call volume (one per booking) means no performance concern. |
| Google Meet link creation | **n8n** (if connected) | Same Calendar API call, same reasoning. |
| Salesperson email/Slack notification | **n8n** (if connected) | Simple fan-out notification, no state to own. |
| Gmail sending (marketing/transactional) | **See "Option A/B" below — must be decided, not split** | |
| Google Sheets export | **n8n** (if connected) | Reporting convenience, not core state. |
| CRM sync | **n8n** (if connected) | Integration-simplification is n8n's actual value-add here — bidirectional CRM sync via visual workflow beats hand-rolling a sync job. |

If n8n turns out **not** to be connected (§ above), every "n8n (if connected)" row falls back to Next.js/BullMQ by default — none of them are hard dependencies on n8n existing, they're just better-suited to it if it's already there.

## Email Sequence Ownership — the "One Owner Only" Decision

The brief is explicit that schedule state cannot be split between BullMQ and n8n. Two real options, both viable, genuinely requiring a choice rather than a default:

**Option A — BullMQ owns scheduling, n8n (if connected) only sends the message.**
`EmailMessage`/`SalesActivity` rows, the day-0/3/7/12 delay logic, and all stop-condition checks (reply/booked/bounce/unsubscribe/do-not-contact/client) live entirely in the `email-outreach`/`email-follow-up` BullMQ queues (`docs/integration-audit.md` §6, §11). n8n's only job, if used at all, is receiving a "send this rendered email" webhook call and executing the actual Gmail API call. **Recommended default** — it keeps the stop-condition logic (the highest-risk part, since a missed stop = spam/compliance risk) entirely inside the system that already owns `SuppressionRecord`/`ConsentRecord`, with n8n reduced to a thin, replaceable sending mechanism.

**Option B — n8n owns the complete sequence, reports state changes back to Next.js.**
n8n polls or is triggered per new lead, runs the full day-0/3/7/12 workflow itself, and calls back into a Next.js webhook (`WEBHOOK_SECRET`-authenticated, per `docs/integration-audit.md` §17) on every send/bounce/reply to keep `EmailMessage.status` in sync. Viable if the team is more comfortable editing sequence timing visually in n8n than in code, but puts the stop-condition checks (suppression, consent, unsubscribe) at risk of drifting out of sync with Next.js's own `SuppressionRecord` table unless every n8n send node re-checks suppression via a Next.js API call before sending — an extra round-trip Option A doesn't need.

**Confirmed: Option A.** BullMQ owns all scheduling and stop-condition logic; n8n (once connection details are provided) is used only as the Gmail-send executor and for Calendar/Meet/notification orchestration per the matrix above.

## MVP Automation Split (§17, restated as the concrete take-away)

Stays in Next.js/BullMQ for the MVP, full stop: business data persistence, audit state, deterministic scoring, report state, PDF generation, lead state, suppression enforcement, admin approval, analytics event storage.

Only moves to n8n, and only once confirmed connected: Calendar event creation, Meet link creation, salesperson notification, optionally Gmail *sending* under Option A, optionally Sheets export, optionally CRM sync.

## Workflow Concurrency

Per §16's closing note ("use low workflow concurrency for the MVP") — any n8n workflow that's added should mirror the same conservative concurrency this plan already applies inside BullMQ (`docs/integration-audit.md` §6: audit workers at 2, PDF at 1, email at 1) rather than defaulting to n8n's own higher parallelism settings, since the brief is explicit that n8n does not add server capacity — it shares the same host.
