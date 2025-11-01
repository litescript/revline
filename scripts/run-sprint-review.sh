#!/usr/bin/env bash
set -euo pipefail

# Resolve absolute paths to avoid cd issues
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
REPORT_DIR="${REPORT_DIR:-${ROOT_DIR}/reports}"
mkdir -p "$REPORT_DIR"

API_BASE="${API_BASE:-http://localhost:8000/api/v1}"
OPENAPI_URL="${OPENAPI_URL:-http://localhost:8000/openapi.json}"

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="${REPORT_DIR}/sprint-review-${STAMP}.md"
LATEST="${REPORT_DIR}/sprint-review-latest.md"

PASS=0; WARN=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf "✅ %s\n" "$*"; }
warn() { WARN=$((WARN+1)); printf "⚠️  %s\n" "$*"; }
fail() { FAIL=$((FAIL+1)); printf "❌ %s\n" "$*"; }

ensure_tools() {
  command -v jq >/dev/null || { echo "jq required"; exit 2; }
  command -v curl >/dev/null || { echo "curl required"; exit 2; }
}

pick_pkg() {
  if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then echo pnpm; return; fi
  if command -v npm  >/dev/null 2>&1 && [ -f "package.json"   ]; then echo npm;  return; fi
  echo ""
}

run_if_script() {
  local runner="$1" script="$2" args="${3:-}"
  if [ "$runner" = "pnpm" ] && jq -e ".scripts[\"$script\"]" package.json >/dev/null 2>&1; then
    pnpm "$script" $args
    return $?
  fi
  if [ "$runner" = "npm" ] && jq -e ".scripts[\"$script\"]" package.json >/dev/null 2>&1; then
    npm run --silent "$script" -- $args
    return $?
  fi
  return 127
}

mkdir -p "$REPORT_DIR"
ensure_tools

{
  echo "# Revline Sprint Reviewer — ${STAMP}"
  echo
  echo "API_BASE: ${API_BASE}"
  echo
  echo "| Category | Check | Result | Notes | Remediation |"
  echo "|---|---|---|---|---|"
} > "$REPORT"

grade_row() {
  local cat="$1" check="$2" result="$3" notes="$4" fix="$5"
  printf "| %s | %s | %s | %s | %s |\n" "$cat" "$check" "$result" "$notes" "$fix" >> "$REPORT"
}

# ---------- Docker/API Health ----------
if [ -f infra/docker-compose.yml ]; then
  # try to bring API up if it's not already
  docker compose -f infra/docker-compose.yml up -d >/dev/null 2>&1 || true
fi

ATTEMPTS=90
until curl -sf "${API_BASE}/health" >/dev/null 2>&1 || [ $ATTEMPTS -eq 0 ]; do
  ATTEMPTS=$((ATTEMPTS-1)); sleep 2
done

if [ $ATTEMPTS -eq 0 ]; then
  fail "API healthcheck failed"
  grade_row "Docker/API" "API /health" "❌" "API not ready at ${API_BASE}/health" "Ensure compose is up and API boots"
else
  ok "API healthy"
  grade_row "Docker/API" "API /health" "✅" "API responded OK" "—"
fi

# ---------- Frontend: Type & Lint ----------
if [ "${SKIP_FRONTEND:-0}" != "1" ] && [ -d frontend ]; then
  pushd frontend >/dev/null
  PKG="$(pick_pkg)"
  if [ -n "$PKG" ]; then
    # Typecheck
    if run_if_script "$PKG" "typecheck"; then
      ok "frontend typecheck"
      grade_row "Frontend" "TypeScript typecheck" "✅" "" "—"
    else
      # fallback tsc --noEmit if available
      if npx -y tsc --noEmit >/dev/null 2>&1; then
        ok "frontend tsc (fallback)"
        grade_row "Frontend" "TypeScript typecheck (fallback)" "✅" "" "—"
      else
        fail "frontend typecheck failed or no tsc"
        grade_row "Frontend" "TypeScript typecheck" "❌" "No script or tsc failure" "Add typecheck script or fix TS errors"
      fi
    fi

    # Lint
    if run_if_script "$PKG" "lint"; then
      ok "frontend lint"
      grade_row "Frontend" "Lint" "✅" "" "—"
    else
      warn "frontend lint script missing"
      grade_row "Frontend" "Lint" "⚠️" "No lint script" "Add lint script (eslint) or ignore intentionally"
    fi

    # Tests + coverage (optional)
    if [ "${SKIP_TESTS:-0}" != "1" ]; then
      if run_if_script "$PKG" "test" "-- --coverage"; then
        # try to parse coverage summary
        if [ -f coverage/coverage-summary.json ]; then
          LINES_TOTAL=$(jq '.total.lines.total' coverage/coverage-summary.json 2>/dev/null || echo 0)
          LINES_PCT=$(jq '.total.lines.pct'   coverage/coverage-summary.json 2>/dev/null || echo 0)
          ok "frontend tests ran"
          grade_row "Frontend" "Tests & Coverage" "✅" "Lines ${LINES_PCT}% (${LINES_TOTAL})" "—"
        else
          warn "frontend coverage summary missing"
          grade_row "Frontend" "Tests" "⚠️" "No coverage/coverage-summary.json" "Enable coverage output"
        fi
      else
        warn "frontend tests not runnable"
        grade_row "Frontend" "Tests" "⚠️" "No test script or failing tests" "Add tests or investigate failures"
      fi
    fi
  else
    warn "frontend package manager not detected"
    grade_row "Frontend" "Tooling" "⚠️" "pnpm/npm missing or no package.json" "Install tooling or skip"
  fi
  popd >/dev/null
else
  warn "frontend skipped"
  grade_row "Frontend" "Checks" "⚠️" "SKIP_FRONTEND=1 or no frontend dir" "—"
fi

# ---------- Backend: Lint (ruff) + mypy (optional) ----------
if [ "${SKIP_BACKEND:-0}" != "1" ] && [ -d api ]; then
  pushd api >/dev/null
  # Ruff
  if grep -q "\[tool.ruff\]" pyproject.toml 2>/dev/null; then
    if python3 -m ruff --version >/dev/null 2>&1; then
      if python3 -m ruff check . >/dev/null 2>&1; then
        ok "backend ruff lint"
        grade_row "Backend" "Ruff lint" "✅" "" "—"
      else
        fail "backend ruff lint failed"
        grade_row "Backend" "Ruff lint" "❌" "Lint errors" "Fix ruff violations or adjust config"
      fi
    else
      warn "ruff not installed"
      grade_row "Backend" "Ruff lint" "⚠️" "ruff not available" "pip install ruff or skip"
    fi
  else
    warn "ruff config not found"
    grade_row "Backend" "Ruff lint" "⚠️" "No [tool.ruff] in pyproject.toml" "Add ruff or mark as intentional"
  fi

  # mypy (optional)
  if grep -q "\[tool.mypy\]" pyproject.toml 2>/dev/null; then
    if python3 -m mypy --version >/dev/null 2>&1; then
      if python3 -m mypy . >/dev/null 2>&1; then
        ok "backend mypy"
        grade_row "Backend" "Mypy typecheck" "✅" "" "—"
      else
        warn "backend mypy failed"
        grade_row "Backend" "Mypy typecheck" "⚠️" "Type issues" "Fix types or tune config"
      fi
    else
      warn "mypy not installed"
      grade_row "Backend" "Mypy typecheck" "⚠️" "mypy not available" "pip install mypy or skip"
    fi
  fi
  popd >/dev/null
else
  warn "backend skipped"
  grade_row "Backend" "Checks" "⚠️" "SKIP_BACKEND=1 or no api dir" "—"
fi

# ---------- API Contract Diff ----------
if [ "${SKIP_CONTRACT:-0}" != "1" ]; then
  BASELINE="api/openapi-baseline.json"
  TMP="$(mktemp)"
  if curl -sf "${OPENAPI_URL}" -o "$TMP"; then
    if [ -f "$BASELINE" ]; then
      # naive diff (structure-only): compare normalized JSON (jq sorting keys)
      A="$(mktemp)"; B="$(mktemp)"
      jq -S . "$BASELINE" > "$A" || true
      jq -S . "$TMP"      > "$B" || true
      if diff -u "$A" "$B" >/dev/null 2>&1; then
        ok "OpenAPI matches baseline"
        grade_row "Contract" "OpenAPI diff" "✅" "No changes" "—"
      else
        warn "OpenAPI changed vs baseline"
        grade_row "Contract" "OpenAPI diff" "⚠️" "Schema changed; review diffs" "Update baseline after approval"
        echo "----- OpenAPI Diff (context) -----" >> "$REPORT"
        diff -u "$A" "$B" | sed -n '1,200p' >> "$REPORT" || true
      fi
    else
      # establish baseline on first run (not a failure)
      mkdir -p "$(dirname "$BASELINE")"
      cp -f "$TMP" "$BASELINE"
      ok "OpenAPI baseline created"
      grade_row "Contract" "OpenAPI baseline" "✅" "Baseline established" "Review & commit baseline file"
    fi
  else
    fail "OpenAPI fetch failed"
    grade_row "Contract" "OpenAPI fetch" "❌" "Could not GET ${OPENAPI_URL}" "Ensure API exposes /openapi.json"
  fi
else
  warn "contract check skipped"
  grade_row "Contract" "OpenAPI" "⚠️" "SKIP_CONTRACT=1" "—"
fi

# ---------- Summary ----------
echo >> "$REPORT"
echo "Summary: ${PASS} ✅  ·  ${WARN} ⚠️  ·  ${FAIL} ❌" >> "$REPORT"
cp -f "$REPORT" "$LATEST"

# exit code policy
if [ "$FAIL" -gt 0 ]; then
  exit 2
fi
