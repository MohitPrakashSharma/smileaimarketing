# Agent File Ownership

To support safe parallel execution, this document assigns distinct file ownership boundaries to each specialist agent role. No two agents may modify the same files concurrently.

---

## 1. Directory & File Allocation Matrix

| Agent Specialist Role | Primary Area | Create / Modify Target Files |
| :--- | :--- | :--- |
| **Backend & Database Agent** | DB Schema, ORM, Auth foundation | `prisma/schema.prisma`<br>`lib/prisma.ts`<br>`lib/auth.ts`<br>`app/api/auth/**`<br>`middleware.ts` |
| **UI/UX Agent** | Public Website, Styling, Forms | `app/globals.css`<br>`app/page.tsx` (Hero form)<br>`app/free-dental-audit/**`<br>`app/thank-you/**`<br>`app/privacy/**`<br>`components/Hero.tsx` |
| **Audit & Lead Intelligence Agent** | Audit Jobs, Crawlers, Reports | `app/audit/[publicToken]/**`<br>`app/api/audit/inbound-trigger/**`<br>`app/api/audit/unlock-lead/**`<br>`lib/audit-rules.ts`<br>`workers/jobs/analyse-website.ts`<br>`workers/jobs/analyse-local-visibility.ts`<br>`workers/jobs/generate-audit.ts` |
| **Outreach & Email Agent** | Sequence Engine, Webhooks | `app/admin/outreach/**`<br>`app/api/webhooks/email-events/**`<br>`app/unsubscribe/**`<br>`lib/email.ts`<br>`workers/jobs/send-email.ts`<br>`workers/jobs/schedule-email.ts` |
| **Appointment Agent** | Calendars, Reminders | `app/book-consultation/**`<br>`app/api/audit/[publicToken]/book-meeting/**`<br>`app/api/audit/[publicToken]/request-visit/**`<br>`lib/calendar.ts`<br>`workers/jobs/create-appointment.ts` |
| **Admin UI Agent** (shared with QA) | Admin Dashboard Panels | `app/admin/campaigns/**`<br>`app/admin/businesses/**`<br>`app/admin/audits/**`<br>`app/admin/appointments/**`<br>`app/admin/pipeline/**`<br>`app/admin/settings/**` |
| **QA, Security & Performance Agent** | Tests, Rate limits, Bot protection | `tests/**`<br>`playwright.config.ts`<br>`lib/rate-limit.ts`<br>`components/Honeypot.tsx` |
| **Deployment & Observability Agent** | Docker, Traefik, CI/CD Actions | `Dockerfile`<br>`docker-compose.yml`<br>`traefik.yml`<br>`.github/workflows/deploy.yml`<br>`lib/logger.ts` |

---

## 2. Collision Avoidance Protocols

1. **Shared Libs Isolation**: Common database clients (`lib/prisma.ts`) are generated once by the **Backend & Database Agent** and consumed as read-only references by others.
2. **Component Reusability**: General layouts (Header, Footer, Eyebrow) are stable and should not be modified by other agents without approval.
3. **Route Handlers Isolation**: Each API endpoint resides in a separate route directory, preventing Git merge conflicts in Next.js App Router files.
