# sprint-reviewer (Revline)

## Purpose
Enforce a pragmatic **pre-merge quality gate** on PRs touching the backend (`api/**`) or frontend (`frontend/**`) by running a consistent suite of checks and producing a single markdown report with ✅/⚠️/❌ findings.

## Scope
1) **Type Safety & Lint**
   - Frontend: TypeScript typecheck (`tsc --noEmit`) and lints (`npm run lint`/`pnpm lint` if present).
   - Backend: Ruff lint (if `pyproject.toml` has ruff), optional mypy (if configured).

2) **API Contract Stability**
   - Fetch live OpenAPI schema from `http://localhost:8000/openapi.json` and diff against baseline:
     - If baseline file exists at `api/openapi-baseline.json`, report schema diffs.
     - If baseline missing, create it (first run ⇒ baseline establish, not a failure).

3) **Tests & Coverage (If available)**
   - Frontend: run tests (`npm test -- --coverage` or `pnpm test --coverage` if script exists) and parse `coverage/coverage-summary.json`.
   - Backend: detect `pytest` with `--cov` via `pyproject.toml` or `pytest.ini` and parse `coverage.xml`/`coverage.json`.
   - On PRs, compare to a stored “last-known” report if available; otherwise just publish current numbers (no fail).

4) **Docker Compose Health**
   - If `infra/docker-compose.yml` exists, ensure API service boots and health/`/api/v1/health` = OK.
   - Mark ❌ if API never becomes ready.

## Output
- Timestamped markdown report at `reports/sprint-review-YYYYMMDD-HHMMSS.md`
- Convenience copy `reports/sprint-review-latest.md`
- Table format:
  | Category | Check | Result | Notes | Remediation |

**Summary line:** `Summary: <N> ✅  ·  <M> ⚠️  ·  <K> ❌`

## Pass/Fail Policy
- CI **fails only on ❌** (critical blockers).
- ⚠️ items comment on PR but don’t fail.

## Configuration
- `API_BASE` (default `http://localhost:8000/api/v1`)
- Node tooling: detects `pnpm` > `npm` automatically.
- Optional skip flags via env:
  - `SKIP_FRONTEND=1`
  - `SKIP_BACKEND=1`
  - `SKIP_CONTRACT=1`
  - `SKIP_TESTS=1`

## Done Criteria
- A report is generated with all relevant sections.
- On first run, OpenAPI baseline captured if missing.
- CI job posts a summary comment and fails only for ❌.
