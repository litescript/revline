#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f infra/docker-compose.yml"

echo "==> Rebuild core services"
$COMPOSE down -v --remove-orphans
$COMPOSE build --no-cache

echo "==> Start database + redis first"
$COMPOSE up -d db redis

echo "==> Wait for Postgres to accept connections"
until $COMPOSE exec -T db bash -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1' >/dev/null 2>&1; do
  sleep 1
done

echo "==> Start API"
$COMPOSE up -d api

echo "==> Run Alembic migrations"
$COMPOSE exec -T api alembic upgrade head

echo "==> Seed meta (statuses, categories)"
$COMPOSE exec -T api python -m app.core.seed_meta

echo "==> Seed demo Active ROs (idempotent)"
$COMPOSE exec -T api python -m app.core.seed_active_ros

echo "==> Wait for API health"
until curl -sf http://localhost:8000/api/v1/health >/dev/null 2>&1; do
  sleep 1
done

echo "==> Endpoint checks"
echo "GET /api/v1/stats"
curl -sf http://localhost:8000/api/v1/stats | jq . || true

echo "==> Assert active ROs have valid status codes"
bad=$(curl -sf http://localhost:8000/api/v1/ros/active | jq '[.[] | select((.status.status_code==null) or (.status.status_code==""))] | length')
if [ "${bad:-0}" -ne 0 ]; then
  echo "ERROR: $bad active ROs have empty/unknown status_code"
  exit 1
fi
echo "✓ All active ROs have valid status_code"

echo "GET /api/v1/ros/active | length"
curl -sf http://localhost:8000/api/v1/ros/active | jq 'length' || true

echo "GET /api/v1/ros/active[0].status"
curl -sf http://localhost:8000/api/v1/ros/active | jq '.[0].status' || true

echo "GET /api/v1/auth/me (unauth; expect 401)"
curl -sf -i http://localhost:8000/api/v1/auth/me | sed -n '1,8p'

echo "==> SUCCESS"
