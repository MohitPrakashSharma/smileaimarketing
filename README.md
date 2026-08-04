# Smile AI Marketing

A dental-marketing lead-generation platform: a free local-visibility audit funnel for dental practices, plus an admin console for running discovery campaigns, reviewing audits, and managing outreach and appointments.

**Stack**: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL + Prisma · Redis + BullMQ.

## Getting Started

**Prerequisites**: Node.js 20.9+, Docker (for Postgres/Redis).

1. Start the database and cache:
   ```bash
   docker compose up -d
   ```
2. Copy the environment template and fill in real values:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies and set up the database:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) for the public site, or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) for the admin console (seed an admin user first — see `prisma/seed.ts`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/            Routes (public pages, /admin console, /api handlers)
components/     Shared UI — components/ui/ holds the form primitive library
lib/            Server-side utilities (Prisma client, env validation, auth, queues)
prisma/         Database schema and seed script
docs/           Audits, architecture plans, and MVP readiness reports
seo/            Keyword research and content-planning data
```

## Documentation

See `docs/` for the current state of the system — start with `docs/mvp-readiness.md` for what's working versus mocked/missing, and `docs/integration-audit.md` for third-party integration status.
