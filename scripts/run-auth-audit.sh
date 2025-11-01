#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8000/api/v1}"
REPORT_DIR="reports"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="${REPORT_DIR}/auth-audit-${STAMP}.md"
LATEST="${REPORT_DIR}/auth-audit-latest.md"
COOKIEJAR="$(mktemp)"
TMPDIR="$(mktemp -d)"
PASS=0; WARN=0; FAIL=0

note()  { printf "%s\n" "$*" >&2; }
ok()    { PASS=$((PASS+1)); printf "✅ %s\n" "$*"; }
warn()  { WARN=$((WARN+1)); printf "⚠️  %s\n" "$*"; }
fail()  { FAIL=$((FAIL+1)); printf "❌ %s\n" "$*"; }

json_field() { jq -r "$1"; }

# --- helpers -----------------------------------------------------------
post_json() {
  local path="$1"; shift
  curl -sS -X POST -H "Content-Type: application/json" -H "Accept: application/json" \
    -d "$*" -c "$COOKIEJAR" -b "$COOKIEJAR" \
    -w "\n%{http_code}\n" "${API_BASE}${path}"
}

get_auth() {
  local path="$1"; local token="$2"
  curl -sS -H "Authorization: Bearer ${token}" -H "Accept: application/json" \
    -c "$COOKIEJAR" -b "$COOKIEJAR" \
    -w "\n%{http_code}\n" "${API_BASE}${path}"
}

get_plain() {
  local path="$1"
  curl -sS -H "Accept: application/json" \
    -c "$COOKIEJAR" -b "$COOKIEJAR" \
    -w "\n%{http_code}\n" "${API_BASE}${path}"
}

# --- Stage A: Live API -------------------------------------------------
mkdir -p "$REPORT_DIR"
{
  echo "# Revline Auth Audit — ${STAMP}"
  echo
  echo "API_BASE: ${API_BASE}"
  echo
  echo "## Live API Tests"
  echo
} > "$REPORT"

email="audit_${STAMP}@example.com"
password="Audit!${STAMP}a"

# 1) register
RESP="$(post_json "/auth/register" "{\"email\":\"${email}\",\"password\":\"${password}\"}")"
BODY="$(printf "%s" "$RESP" | sed '$d')"
CODE="$(printf "%s" "$RESP" | tail -n1)"
if [[ "$CODE" =~ ^20[01]$ ]]; then ok "register $CODE"; else fail "register $CODE"; fi
echo "- register: ${CODE}" >> "$REPORT"

# 2) login
RESP="$(post_json "/auth/login" "{\"email\":\"${email}\",\"password\":\"${password}\"}")"
BODY="$(printf "%s" "$RESP" | sed '$d')"
CODE="$(printf "%s" "$RESP" | tail -n1)"
ACCESS="$(printf "%s" "$BODY" | jq -r '.access_token // empty')"
if [[ "$CODE" =~ ^20[01]$ ]] && [[ -n "$ACCESS" ]]; then ok "login $CODE"; else fail "login $CODE"; fi
echo "- login: ${CODE}" >> "$REPORT"

# 3) me (200)
RESP="$(get_auth "/auth/me" "$ACCESS")"
BODY="$(printf "%s" "$RESP" | sed '$d')"
CODE="$(printf "%s" "$RESP" | tail -n1)"
if [[ "$CODE" == "200" ]]; then ok "me (with access) 200"; else fail "me (with access) $CODE"; fi
echo "- me (with access): ${CODE}" >> "$REPORT"

# 4) refresh (cookie based)
RESP="$(post_json "/auth/refresh" "{}")"
BODY="$(printf "%s" "$RESP" | sed '$d')"
CODE="$(printf "%s" "$RESP" | tail -n1)"
NEW_ACCESS="$(printf "%s" "$BODY" | jq -r '.access_token // empty')"
if [[ "$CODE" == "200" ]] && [[ -n "$NEW_ACCESS" ]]; then ok "refresh 200"; else fail "refresh $CODE"; fi
echo "- refresh: ${CODE}" >> "$REPORT"

# 5) logout
RESP="$(post_json "/auth/logout" "{}")"
CODE="$(printf "%s" "$RESP" | tail -n1)"
if [[ "$CODE" =~ ^20[04]$ ]]; then ok "logout $CODE"; else fail "logout $CODE"; fi
echo "- logout: ${CODE}" >> "$REPORT"

# 6) me after logout/no token → 401
RESP="$(get_plain "/auth/me")"
CODE="$(printf "%s" "$RESP" | tail -n1)"
if [[ "$CODE" == "401" ]]; then ok "me (no token) 401"; else fail "me (no token) $CODE"; fi
echo "- me (no token): ${CODE}" >> "$REPORT"

# Error paths
echo >> "$REPORT"
echo "### Error Paths" >> "$REPORT"

RESP="$(post_json "/auth/login" "{\"email\":\"${email}\",\"password\":\"wrongpass\"}")"
CODE="$(printf "%s" "$RESP" | tail -n1)"
[[ "$CODE" == "401" ]] && ok "login bad creds 401" || warn "login bad creds $CODE"
echo "- login bad creds: ${CODE}" >> "$REPORT"

RESP="$(get_auth "/auth/me" "bogus.token.value")"
CODE="$(printf "%s" "$RESP" | tail -n1)"
[[ "$CODE" == "401" ]] && ok "me malformed token 401" || warn "me malformed token $CODE"
echo "- me malformed token: ${CODE}" >> "$REPORT"

RESP="$(post_json "/auth/refresh" "{}")"
CODE="$(printf "%s" "$RESP" | tail -n1)"
[[ "$CODE" == "401" ]] && ok "refresh no cookie 401" || warn "refresh no cookie $CODE"
echo "- refresh no cookie: ${CODE}" >> "$REPORT"

# --- Stage B: Static Checks -------------------------------------------
echo >> "$REPORT"
echo "## Static Checks" >> "$REPORT"

grade_row() {
  local cat="$1" check="$2" result="$3" notes="$4" fix="$5"
  printf "| %s | %s | %s | %s | %s |\n" "$cat" "$check" "$result" "$notes" "$fix" >> "$REPORT"
}

echo "| Category | Check | Result | Notes | Remediation |" >> "$REPORT"
echo "|---|---|---|---|---|" >> "$REPORT"

# Backend
if grep -Rqs "CryptContext(schemes=.*bcrypt" api/; then ok "bcrypt present"; grade_row "Backend" "Password hashing uses bcrypt" "✅" "" "—"; else fail "no bcrypt"; grade_row "Backend" "Password hashing uses bcrypt" "❌" "bcrypt not found" "Use passlib CryptContext(bcrypt)"; fi
if grep -Rqs "exp" api/app/core/security.py api/app/routers/auth.py; then ok "JWT exp claim present"; grade_row "Backend" "JWT includes exp" "✅" "" "—"; else warn "exp claim not found"; grade_row "Backend" "JWT includes exp" "⚠️" "exp claim not detected" "Ensure exp in JWT payload"; fi
if grep -Rqs "redis" api/ && grep -Rqs "refresh" api/; then ok "refresh JTI via Redis likely"; grade_row "Backend" "Refresh JTI tracked in Redis" "✅" "" "—"; else warn "Redis refresh tracking not detected"; grade_row "Backend" "Refresh JTI tracked in Redis" "⚠️" "no obvious refresh JTI usage" "Store refresh JTI with TTL"; fi
if grep -RqsE "rate.?limit|slowapi|Limiter|Depends\(Limiter|get_auth_limiter" api/app/routers/auth.py; then ok "rate-limit present"; grade_row "Backend" "Rate limiting on login/register" "✅" "" "—"; else warn "rate-limit missing"; grade_row "Backend" "Rate limiting on login/register" "⚠️" "none detected" "Add limiter around auth endpoints"; fi
if grep -RqsE "HTTPBearer|OAuth2PasswordBearer" api/app/core/security.py api/app/routers/auth.py; then ok "FastAPI security dependency present"; grade_row "Backend" "Bearer parsing via security dependency" "✅" "" "—"; else warn "manual Bearer parsing"; grade_row "Backend" "Bearer parsing via security dependency" "⚠️" "manual header parsing" "Use HTTPBearer/OAuth2 deps"; fi

# Frontend
if grep -Rqs "SKEW_MS" frontend/ || grep -Rqs "early" frontend/; then ok "early-expire skew"; grade_row "Frontend" "Early-expire skew applied" "✅" "" "—"; else warn "no skew found"; grade_row "Frontend" "Early-expire skew applied" "⚠️" "not detected" "Apply ~60-120s skew"; fi
if grep -Rqs "clearSession" frontend/; then ok "401 triggers clearSession"; grade_row "Frontend" "401 triggers session clear" "✅" "" "—"; else warn "no clearSession on 401"; grade_row "Frontend" "401 triggers session clear" "⚠️" "not detected" "Ensure 401 clears session"; fi
if grep -Rqs "RequireAuth" frontend/src/routes || grep -Rqs "PrivateRoute" frontend/src/routes; then ok "protected routes"; grade_row "Frontend" "Protected routes enforced" "✅" "" "—"; else warn "no protected route wrapper"; grade_row "Frontend" "Protected routes enforced" "⚠️" "not detected" "Wrap protected routes"; fi

# --- Stage C: Config Checks -------------------------------------------
echo >> "$REPORT"
echo "## Config Checks" >> "$REPORT"

ENV_FILE=""
for f in .env .env.local api/.env api/.env.local; do
  if [ -f "$f" ]; then ENV_FILE="$f"; break; fi
done

if [ -n "$ENV_FILE" ]; then
  echo "- Using env file: \`$ENV_FILE\`" >> "$REPORT"
  JWT_SECRET="$(grep -E '^JWT_SECRET=' "$ENV_FILE" | sed 's/^JWT_SECRET=//')"
  COOKIE_SECURE="$(grep -E '^COOKIE_SECURE=' "$ENV_FILE" | sed 's/^COOKIE_SECURE=//')"
  COOKIE_SAMESITE="$(grep -E '^COOKIE_SAMESITE=' "$ENV_FILE" | sed 's/^COOKIE_SAMESITE=//')"
  CORS_ORIGINS="$(grep -E '^CORS_ORIGINS=' "$ENV_FILE" | sed 's/^CORS_ORIGINS=//')"

  # JWT secret strength
  if [ -n "$JWT_SECRET" ] && [ "${#JWT_SECRET}" -ge 32 ]; then ok "JWT secret length ok"; echo "- JWT_SECRET length: ✅" >> "$REPORT"; else fail "JWT secret too short/empty"; echo "- JWT_SECRET length: ❌ (>=32 recommended)" >> "$REPORT"; fi
  # cookie flags
  case "${COOKIE_SECURE:-}" in
    [Tt]rue|1|yes) ok "COOKIE_SECURE true"; echo "- COOKIE_SECURE: ✅" >> "$REPORT";;
    *) warn "COOKIE_SECURE not true"; echo "- COOKIE_SECURE: ⚠️ (true in prod)" >> "$REPORT";;
  esac
  case "${COOKIE_SAMESITE:-}" in
    [Ll]ax|[Ss]trict) ok "COOKIE_SAMESITE ok"; echo "- COOKIE_SAMESITE: ✅" >> "$REPORT";;
    *) warn "COOKIE_SAMESITE not Lax/Strict"; echo "- COOKIE_SAMESITE: ⚠️ (Lax or Strict recommended)" >> "$REPORT";;
  esac
  # CORS
  if printf "%s" "${CORS_ORIGINS:-}" | grep -q '\*'; then warn "CORS wildcard"; echo "- CORS_ORIGINS: ⚠️ (avoid wildcard in prod)" >> "$REPORT"; else ok "CORS not wildcard"; echo "- CORS_ORIGINS: ✅" >> "$REPORT"; fi
else
  warn ".env not found — skipping config detail checks"
  echo "- No .env found; skipping detailed config checks" >> "$REPORT"
fi

# --- Summary & write table header if missing --------------------------
echo >> "$REPORT"
TOTAL=$((PASS+WARN+FAIL))
echo "Summary: ${PASS} ✅  ·  ${WARN} ⚠️  ·  ${FAIL} ❌  (Total checks: ${TOTAL})" >> "$REPORT"

# maintain latest copy
cp -f "$REPORT" "$LATEST"

# exit code policy: fail only if there are ❌
if [ "$FAIL" -gt 0 ]; then
  note "Audit completed with ${FAIL} ❌. See ${REPORT}"
  exit 2
else
  note "Audit completed with no critical failures. See ${REPORT}"
fi
