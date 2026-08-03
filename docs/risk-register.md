# Risk Register

This document lists critical technical, operational, and integration risks identified for the Smile AI Marketing platform upgrade, along with corresponding impact analysis and mitigation strategies.

---

## 1. Active Risks & Constraints

| Risk ID | Risk Title | Category | Severity | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Bleeding-Edge Next.js/React Versions | Technical | **High** | The codebase uses Next.js `16.2.12` and React `19.2.4`. These have breaking changes, deprecations, and library incompatibilities compared to standard Next.js 13-15 setups. | Inspect Next.js 16 documentation in `node_modules/next/dist/docs/` before implementing new route handlers, layout conventions, or server actions. Run `npx tsc --noEmit` and `npm run build` after every major implementation step. |
| **RSK-02** | Absence of Database & Worker Infrastructure | Infrastructure | **High** | The project is currently a static frontend. Implementing PostgreSQL, Redis, BullMQ, and worker threads from scratch adds architectural complexity. | Adopt a decoupled worker-server architecture (separate entrypoints for Next.js web application and the BullMQ background worker) to prevent blocking main render threads. Use Docker Compose to test local persistence. |
| **RSK-03** | Third-party API Failures & Cost Leakage | External API | **Medium** | Discovery, Audit, and Website analysis jobs depend on external APIs (e.g., PageSpeed, Google Places, DataForSEO, email checkers). These are rate-limited, paid, or flaky. | Enforce retry policies with exponential backoff on all worker jobs. Implement local mock mode for development/staging. Enforce hard monthly caps or query thresholds on admin dashboards. |
| **RSK-04** | Spam & Abuse on Public Audit Form | Security | **Medium** | The `/free-dental-audit` route is open to public submissions, creating exposure to denial-of-service, database bloating, or API billing exhaustion. | Deploy strict server-side rate limiting (via Redis token buckets) and client/server-side bot protection (e.g., Cloudflare Turnstile or invisible honeypot fields). |
| **RSK-05** | GDPR / HIPAA Compliance on Patient Data | Legal / Privacy | **High** | While the system generates marketing leads and clinic audits, it schedules patient bookings, potentially touching medical-intent data. | Strictly segregate clinic outreach from health-intent appointment booking details. Implement strong data suppression lists, consent logging, and explicit unsubscribe routes. Do not log PII in worker traces or general analytics. |
| **RSK-06** | Deployment Port & SSL Configuration | Infrastructure | **Medium** | Moving from a generic Nginx setup to Traefik proxy inside Docker Compose changes reverse proxy and SSL certificate management. | Create dedicated, tested Docker Compose configurations with automated Traefik Let's Encrypt certificate hooks. Prevent exposure of PostgreSQL/Redis ports to the public interface. |
