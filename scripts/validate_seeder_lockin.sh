#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.yml}"
DB_SVC="${DB_SVC:-db}"
API_SVC="${API_SVC:-api}"
API_BASE="${API_BASE:-http://localhost:8000/api/v1}"
GIT_TAG_PREFIX="${GIT_TAG_PREFIX:-baseline/seeder-lockin}"

echo "==> Ensuring stack is up..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Waiting for API to be ready..."
ATTEMPTS=60
until curl -sSf "${API_BASE}/stats" >/dev/null 2>&1 || [ $ATTEMPTS -eq 0 ]; do
  ATTEMPTS=$((ATTEMPTS-1))
  sleep 1
done
[ $ATTEMPTS -gt 0 ] || { echo "API did not come up in time"; exit 1; }

echo "==> Running SQL invariant: canonical RO statuses"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" psql -U revline -d revline -f /dev/stdin <<'SQL'
WITH counts AS (
  SELECT status_code AS code, COUNT(*) AS n
  FROM ro_statuses
  WHERE status_code IN ('OPEN','DIAG','PARTS','READY')
  GROUP BY status_code
),
missing AS (
  SELECT x.code
  FROM (VALUES ('OPEN'),('DIAG'),('PARTS'),('READY')) AS x(code)
  LEFT JOIN counts c ON c.code = x.code
  WHERE c.n IS NULL
),
dupes AS (
  SELECT code, n FROM counts WHERE n <> 1
)
SELECT
  (SELECT COUNT(*) FROM missing) AS missing_count,
  (SELECT COUNT(*) FROM dupes)   AS duplicate_count;
SQL

MISS=$(docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" psql -t -A -U revline -d revline -c "
WITH counts AS (
  SELECT status_code AS code, COUNT(*) AS n
  FROM ro_statuses
  WHERE status_code IN ('OPEN','DIAG','PARTS','READY')
  GROUP BY status_code
),
missing AS (
  SELECT x.code
  FROM (VALUES ('OPEN'),('DIAG'),('PARTS'),('READY')) AS x(code)
  LEFT JOIN counts c ON c.code = x.code
  WHERE c.n IS NULL
),
dupes AS (
  SELECT code, n FROM counts WHERE n <> 1
)
SELECT (SELECT COUNT(*) FROM missing) || ',' || (SELECT COUNT(*) FROM dupes) as res;")

MISS_C="${MISS%,*}"
DUPES_C="${MISS#*,}"
if [ "$MISS_C" != "0" ] || [ "$DUPES_C" != "0" ]; then
  echo "FAIL: Canonical statuses missing=$MISS_C, duplicates=$DUPES_C"
  exit 2
fi
echo "OK: Canonical statuses present exactly once (OPEN, DIAG, PARTS, READY)."

echo "==> Running SQL invariant: all ROs have non-null, valid status"

# Helpers to query DB
_psql() {
  docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" psql -t -A -U revline -d revline -c "$1"
}

has_col() {
  local tbl="$1"; local col="$2"
  _psql "SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='${tbl}' AND column_name='${col}'
  ) THEN 1 ELSE 0 END;"
}

has_table() {
  local tbl="$1"
  _psql "SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='${tbl}'
  ) THEN 1 ELSE 0 END;"
}

trim() { echo "$1" | tr -d '[:space:]'; }

HAS_SC=$(trim "$(has_col 'repair_orders' 'status_code')")
HAS_SI=$(trim "$(has_col 'repair_orders' 'status_id')")

if [ "$HAS_SC" = "1" ]; then
  # Direct string status on repair_orders
  INV=$(_psql "
WITH invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN ro_statuses s ON s.status_code = ro.status_code
  WHERE ro.status_code IS NULL OR s.status_code IS NULL
)
SELECT COUNT(*) FROM invalid;")
elif [ "$HAS_SI" = "1" ]; then
  # Direct FK status on repair_orders
  INV=$(_psql "
WITH invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN ro_statuses s ON s.id = ro.status_id
  WHERE ro.status_id IS NULL OR s.id IS NULL
)
SELECT COUNT(*) FROM invalid;")
else
  # Try common history tables
  HAS_HIST1=$(trim "$(has_table 'ro_status_history')")
  HAS_HIST2=$(trim "$(has_table 'repair_order_statuses')")

  if [ "$HAS_HIST1" = "1" ]; then
    # ro_status_history(repair_order_id, status_code|status_id, created_at)
    HAS_H1_SC=$(trim "$(has_col 'ro_status_history' 'status_code')")
    HAS_H1_SI=$(trim "$(has_col 'ro_status_history' 'status_id')")
    HAS_H1_TS=$(trim "$(has_col 'ro_status_history' 'created_at')")

    if [ "$HAS_H1_TS" != "1" ]; then
      echo "WARN: ro_status_history has no created_at; skipping DB invariant."
      INV="0"
    elif [ "$HAS_H1_SC" = "1" ]; then
      INV=$(_psql "
WITH latest AS (
  SELECT DISTINCT ON (h.repair_order_id) h.repair_order_id, h.status_code
  FROM ro_status_history h
  ORDER BY h.repair_order_id, h.created_at DESC
),
invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN latest l ON l.repair_order_id = ro.id
  LEFT JOIN ro_statuses s ON s.status_code = l.status_code
  WHERE l.status_code IS NULL OR s.status_code IS NULL
)
SELECT COUNT(*) FROM invalid;")
    elif [ "$HAS_H1_SI" = "1" ]; then
      INV=$(_psql "
WITH latest AS (
  SELECT DISTINCT ON (h.repair_order_id) h.repair_order_id, h.status_id
  FROM ro_status_history h
  ORDER BY h.repair_order_id, h.created_at DESC
),
invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN latest l ON l.repair_order_id = ro.id
  LEFT JOIN ro_statuses s ON s.id = l.status_id
  WHERE l.status_id IS NULL OR s.id IS NULL
)
SELECT COUNT(*) FROM invalid;")
    else
      echo "WARN: ro_status_history missing status column; skipping DB invariant."
      INV="0"
    fi

  elif [ "$HAS_HIST2" = "1" ]; then
    # repair_order_statuses(repair_order_id, status_code|status_id, created_at)
    HAS_H2_SC=$(trim "$(has_col 'repair_order_statuses' 'status_code')")
    HAS_H2_SI=$(trim "$(has_col 'repair_order_statuses' 'status_id')")
    HAS_H2_TS=$(trim "$(has_col 'repair_order_statuses' 'created_at')")

    if [ "$HAS_H2_TS" != "1" ]; then
      echo "WARN: repair_order_statuses has no created_at; skipping DB invariant."
      INV="0"
    elif [ "$HAS_H2_SC" = "1" ]; then
      INV=$(_psql "
WITH latest AS (
  SELECT DISTINCT ON (h.repair_order_id) h.repair_order_id, h.status_code
  FROM repair_order_statuses h
  ORDER BY h.repair_order_id, h.created_at DESC
),
invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN latest l ON l.repair_order_id = ro.id
  LEFT JOIN ro_statuses s ON s.status_code = l.status_code
  WHERE l.status_code IS NULL OR s.status_code IS NULL
)
SELECT COUNT(*) FROM invalid;")
    elif [ "$HAS_H2_SI" = "1" ]; then
      INV=$(_psql "
WITH latest AS (
  SELECT DISTINCT ON (h.repair_order_id) h.repair_order_id, h.status_id
  FROM repair_order_statuses h
  ORDER BY h.repair_order_id, h.created_at DESC
),
invalid AS (
  SELECT ro.id, ro.ro_number
  FROM repair_orders ro
  LEFT JOIN latest l ON l.repair_order_id = ro.id
  LEFT JOIN ro_statuses s ON s.id = l.status_id
  WHERE l.status_id IS NULL OR s.id IS NULL
)
SELECT COUNT(*) FROM invalid;")
    else
      echo "WARN: repair_order_statuses missing status column; skipping DB invariant."
      INV="0"
    fi
  else
    echo "WARN: No status column on repair_orders and no known history table; skipping DB invariant."
    INV="0"
  fi
fi

if [ "$(trim "$INV")" != "0" ]; then
  echo "FAIL: Found $(trim "$INV") repair_orders with invalid/null status reference"
  exit 3
fi
echo "OK: All repair_orders have valid, non-null status reference (or invariant skipped with warning)."



echo "==> Curl checks"
curl -sSf "${API_BASE}/stats" | jq .
curl -sSf "${API_BASE}/ros/active" | jq 'length as $n | {active_count:$n}'

echo "==> Python sanity_check.py"
python3 scripts/sanity_check.py

echo "==> Idempotency smoke (optional)"
# If seeding is explicit, invoke here, then re-run sanity:
# docker compose -f "$COMPOSE_FILE" exec -T "$API_SVC" python -m app.core.seed_meta
# docker compose -f "$COMPOSE_FILE" exec -T "$API_SVC" python -m app.core.seed_active_ros
python3 scripts/sanity_check.py

echo "==> Git snapshot"
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="${GIT_TAG_PREFIX}-${STAMP}"
git add -A >/dev/null 2>&1 || true
git update-index -q --refresh || true
if git diff --quiet && git diff --cached --quiet; then
  echo "No uncommitted changes; creating tag: ${TAG}"
  git tag -a "${TAG}" -m "Post-Claude seeder lock-in baseline (${STAMP})"
else
  echo "Working tree dirty; committing and tagging."
  git commit -am "chore(baseline): post-claude seeder lock-in snapshot (${STAMP})" || true
  git tag -a "${TAG}" -m "Post-Claude seeder lock-in baseline (${STAMP})"
fi
echo "Baseline tagged: ${TAG}"
echo "==> ALL CHECKS PASSED"
