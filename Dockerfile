FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Schema-valid placeholders so `next build` (which imports lib/env.server.ts
# during route analysis) does not fail validation. Real secrets are supplied
# at container runtime via docker-compose environment/.env — this build-time
# copy is never used to serve traffic.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV REDIS_URL="redis://localhost:6379"
ENV JWT_SECRET="build-time-placeholder-not-a-real-secret-0"
ENV CRON_SECRET="build-time-placeholder-not-a-real-secret-1"
ENV WEBHOOK_SECRET="build-time-placeholder-not-a-real-secret-2"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Shared with the worker container via a named volume — worker writes
# audit PDFs here (lib/pdfGenerator.ts), web serves them statically.
RUN mkdir -p /app/public/reports && chown -R nextjs:nodejs /app/public

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
