#!/usr/bin/env bash
set -euo pipefail
cd /opt/docker-services/smileaimarketing

echo "=== pulling main ==="
git fetch origin main
git reset --hard origin/main

echo "=== building images ==="
docker compose -f docker-compose.prod.yml build web worker

echo "=== running migrations ==="
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm --no-deps worker npx prisma migrate deploy

echo "=== restarting web + worker ==="
docker compose -f docker-compose.prod.yml up -d --force-recreate web worker

echo "=== pruning dangling images ==="
docker image prune -f

echo "=== status ==="
docker compose -f docker-compose.prod.yml ps
