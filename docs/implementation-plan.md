# Implementation Plan

This document details the development sequence, testing protocols, quality gates, and deployment procedures for the platform upgrade.

---

## 1. Development Phases & Checkpoints

### Phase 1: Shared Core & Data Layer (Backend Agent)
- [ ] Initialize Prisma and database connection helper (`lib/prisma.ts`).
- [ ] Execute initial database migration to configure PostgreSQL tables.
- [ ] Create shared validation schemas using Zod.
- [ ] Implement Redis-based server-side rate limiter utility.

### Phase 2: Security & Auth Foundation (Backend Agent)
- [ ] Implement Next.js App Router admin middleware checking session cookies.
- [ ] Create signup and sign-in API route handlers.
- [ ] Setup secure cookie tokens and CSRF guards.

### Phase 3: Scraping & Audit Core (Audit & Lead Intelligence Agent)
- [ ] Initialize the standalone worker process (`workers/index.ts`) connecting to BullMQ and Redis.
- [ ] Implement Google Maps Pack scraper job (`analyse-local-visibility`).
- [ ] Implement website crawler testing performance, SSL, and mobile layout (`analyse-website`).
- [ ] Implement deterministic score calculator (`calculate-opportunity-score`).
- [ ] Integrate OpenAI/LLM API for rewriting findings into readable copy.

### Phase 4: Public Inbound Funnel (UI/UX Agent & Audit Agent)
- [ ] Modify the landing page (`app/page.tsx` & `components/Hero.tsx`) to support the clinic URL form.
- [ ] Implement the loading status screens showing preliminary checks on `/free-dental-audit`.
- [ ] Build the professional lead capture form.
- [ ] Design the dynamic secure report page `/audit/[publicToken]` showing the opportunity score and competitor gap matrix.

### Phase 5: Email Outreach Engine (Outreach Agent)
- [ ] Design multi-day cold email templates (HTML/Markdown) for outreach steps (Day 0, 3, 7, 12).
- [ ] Build the email scheduler queue handler.
- [ ] Setup incoming webhook receiver for email events (open, click, bounce) with signature verification.
- [ ] Create `/unsubscribe` page writing directly to the `SuppressionRecord` table.

### Phase 6: Booking & Appointment Scheduling (Appointment Agent)
- [ ] Embed the online 15-minute booking calendar widget on `/audit/[publicToken]`.
- [ ] Build calendar availability validation and scheduling API.
- [ ] Create the in-person meeting request form.
- [ ] Write the background job to generate PDF briefings for sales representatives.

### Phase 7: Admin Panel (Admin UI Agent)
- [ ] Create the main campaign setup interface `/admin/campaigns`.
- [ ] Build the business list dashboard `/admin/businesses` with status transition controls.
- [ ] Write the pipeline status tracker `/admin/pipeline` mapping leads from discovered to converted.
- [ ] Create settings panel `/admin/settings` managing API keys, SMTP credentials, and calendars.

---

## 2. Quality Gates & Test Suites

At each phase, agents must run the validation checks. No branch merges are permitted if any check fails.

```text
               ┌──────────────────────────────┐
               │    Pre-commit Lint & Type    │
               │   (eslint & npx tsc --noEmit)│
               └──────────────┬───────────────┘
                              ▼
               ┌──────────────────────────────┐
               │          Unit Tests          │
               │     (Vitest / Jest suite)    │
               └──────────────┬───────────────┘
                              ▼
               ┌──────────────────────────────┐
               │       Production Build       │
               │       (npm run build)        │
               └──────────────┬───────────────┘
                              ▼
               ┌──────────────────────────────┐
               │        E2E Flow Test         │
               │    (Playwright / Cypress)    │
               └──────────────────────────────┘
```

---

## 3. Production Deployment Guide (Docker & Traefik)

The platform is deployed using **Docker Compose** behind **Traefik Edge Router** on Ubuntu.

### Server Dependencies
- Docker Engine >= 24.x
- Docker Compose v2.x
- Public static IP pointing to target domain (e.g., `smileaimarketing.com`)

### Deployment Commands

1. **Clone & Setup Environment**:
   ```bash
   cp .env.example .env
   # Populate PostgreSQL, Redis, Resend, and OpenAI credentials
   ```

2. **Launch Infrastructure**:
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

3. **Verify Health**:
   ```bash
   docker compose ps
   # Query HTTP health endpoint
   curl -I https://smileaimarketing.com/api/health
   ```

### Rollback Protocol
If a deployment fails health checks or introduces critical runtime regressions:
1. Revert to the last known-good commit on the `main` branch.
2. Re-trigger the GitHub Actions workflow, or manually run:
   ```bash
   docker compose down
   docker compose pull
   docker compose up -d
   ```
3. If database schema was altered, apply the reverse migrations.
