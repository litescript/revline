# Revline (MVP)

Modern, modular dealership & shop-management platform.  
**Stack:** FastAPI + PostgreSQL + SQLAlchemy + Alembic · React (Vite, TanStack Query) · Docker Compose

## Dev — bring up the stack

\`\`\`bash
docker compose -f infra/docker-compose.yml up -d --build
\`\`\`

- **API:** http://localhost:8000/api/v1/health  
- **Web:** http://localhost:5173  (Vite proxies `/api/*` → FastAPI)

## Layout
- `backend/` — FastAPI app (hot reload)  
- `frontend/` — Vite app (hot reload, proxy enabled)  
- `infra/` — Dockerfiles & Compose  

## Env
Create a `.env` in the repo root (**not committed**):

\`\`\`
POSTGRES_USER=revline
POSTGRES_PASSWORD=revline
POSTGRES_DB=revline
API_HOST=0.0.0.0
API_PORT=8000
REDIS_URL=redis://redis:6379/0
VITE_API_BASE=http://localhost:8000/api/v1
\`\`\`
