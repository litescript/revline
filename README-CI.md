Revline — CI Workflows (Drop-in)
=================================

This bundle gives you lightweight, fast GitHub Actions checks so pushes to `dev` and PRs kick off again.
It focuses on the **frontend** gates you listed (eslint, tsc, vitest, build) and adds a minimal backend
import/smoke job that doesn't require Postgres/Redis to be running.

Files (place at repo root):
- .github/workflows/frontend-ci.yml  → Node 20; npm ci; lint; typecheck; vitest; build
- .github/workflows/backend-smoke.yml → Python 3.12; import FastAPI app if present

Notes:
- The frontend build sets VITE_API_BASE to http://localhost:8000/api/v1 for CI only.
- If your repo uses different script names, adjust the `--if-present` or rename steps to your scripts.
- You can later layer in DB-backed tests or Dockerized prod-verify as separate workflows when ready.

Quick start:
  1) Extract at repo root so the `.github/workflows` directory exists.
  2) git add .github/workflows
  3) git commit -m "ci: restore Actions (frontend gates + backend smoke)"
  4) git push origin dev

That’s it — new pushes/PRs should show checks in GitHub again.
