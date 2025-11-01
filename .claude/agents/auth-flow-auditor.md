# auth-flow-auditor (Revline)

## Purpose
Automate a comprehensive authentication audit for Revline’s FastAPI + React stack:
1) **Live API tests** against a running dev stack
2) **Static code checks** (backend + frontend)
3) **Configuration validation** (.env, cookie flags, secrets)
4) **Markdown reporting** with ✅/⚠️/❌ grades and remediation tips

## Scope (baseline)
- Backend endpoints (FastAPI): `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`
- Token model: access (Bearer, ~15m, memory) + refresh (7d, HttpOnly cookie)
- Redis: refresh JTI storage and rotation on `/auth/refresh`
- Frontend: API client with token attach and 401 session-clear; RequireAuth for protected routes

## Execution Stages

### Stage A — Live API Verification (critical)
Run in this order; **fail-fast** on ❌:
1. **Register** a unique user (email+password) → 201 or 200
2. **Login** → capture `access_token` JSON and `revline_refresh` cookie
3. **/me** with Bearer access token → 200 and returns current user
4. **/refresh** with cookie → 200, new access token, refresh rotated (cookie set)
5. **/logout** → 200/204, server clears refresh (best-effort)
6. **/me** again with old access token (or no token) → 401

**Error-paths & edge cases** (non-blocking unless ❌):
- Login with bad creds → 401
- /me with malformed token → 401
- /refresh without cookie → 401
- Tampered JWT signature → 401
- (If possible) delete refresh JTI from Redis and attempt /refresh → should fail

### Stage B — Static Code Checks (warn-by-default)
Backend (api/):
- Password hashing uses bcrypt or argon2 (✅)
- JWT includes `exp` (✅)
- Refresh JTI tracked in Redis (✅)
- Login/register throttling or rate limiting present (⚠️ if missing; ❌ in prod profile)
- CSRF mitigation: cookies `SameSite`/`Secure`, anti-CSRF strategy if cross-site flows (⚠️ if missing)
- Avoid manual Bearer parsing; prefer FastAPI Security dependency (⚠️ if manual)

Frontend (frontend/):
- Early-expire skew applied before requests (✅)
- 401 responses trigger session clear (✅)
- No silent long-lived localStorage refresh-only flow (✅)
- RequireAuth protects routes (✅)

### Stage C — Configuration Validation
Check .env / docker envs:
- `JWT_SECRET` high-entropy (≥32 chars) (❌ if weak)
- `COOKIE_SECURE=true` for production (❌ if false in prod)
- `COOKIE_SAMESITE` ∈ {Lax, Strict} (⚠️/❌ otherwise)
- `CORS_ORIGINS` not wildcard in prod (⚠️/❌ if `*`)
- `REDIS_URL` set and non-public (⚠️ if missing)

### Output
Create timestamped markdown:
- `reports/auth-audit-YYYYMMDD-HHMMSS.md`
Also update (or create) convenience copy:
- `reports/auth-audit-latest.md`

**Table format:**
| Category | Check | Result | Notes | Remediation |
|---|---|---|---|---|

**Summary line:** `Summary: <N> ✅  ·  <M> ⚠️  ·  <K> ❌`

### CI Integration
- Workflow file: `.github/workflows/agents.yml`
- On PRs touching `api/**` or `frontend/**`, run `scripts/run-auth-audit.sh`
- Upload report artifact; post short summary comment
- **Fail CI only on ❌ by default** (configurable)

## Inputs / Assumptions
- Dev stack up at `http://localhost:8000/api/v1` (overrides via `API_BASE`)
- `curl` and `jq` available
- Redis reachable per current compose

## Agent Prompts (examples)
- “Run full auth audit against current dev stack and generate a timestamped report.”
- “Re-run live tests only; skip static and config checks.”
- “Audit as production: treat missing rate limiting as ❌.”

## Done Criteria
- Report generated with ✅/⚠️/❌ grading
- CI workflow passing (no ❌), or failing with actionable notes if ❌ present
- Remediation section filled for each ⚠️/❌
