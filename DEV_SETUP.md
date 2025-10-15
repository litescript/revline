# 🧱 Revline — Local Dev Setup

## Overview
This document outlines how to set up a complete local development environment for **Revline** on Ubuntu or macOS.
It assumes standard Unix tooling and bash/zsh shells.

---

## 1️⃣ System Requirements

| Component | Recommended Version | Purpose |
|------------|--------------------|----------|
| Python     | 3.12+              | Backend / FastAPI |
| Node.js    | 22+                | Frontend / Vite |
| pnpm       | latest             | Frontend package manager |
| Docker CE  | 28+                | Container runtime |
| Docker Compose | v2.40+         | Local stack orchestration |
| PostgreSQL client | 16+         | Database CLI |
| Git + GitHub CLI | latest       | Version control |

Optional but helpful:
- `httpie`, `jq`, `rg`, `tmux`, `fzf`, `fd-find`

---

## 2️⃣ Clone and Setup

\`\`\`bash
# Clone the repo
mkdir -p ~/code && cd ~/code
gh repo clone litescript/revline
cd revline
\`\`\`

---

## 3️⃣ Python (Backend) Environment

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt  # if available
pip install black isort flake8 pytest pre-commit
\`\`\`

### Formatting & Linting Config
Defined in `pyproject.toml` and `.flake8` for unified style:
- Black + isort aligned at 100 columns
- Flake8 ignores safe imports and forward refs

---

## 4️⃣ Pre-Commit Hooks

Configured in `.pre-commit-config.yaml`.
To initialize locally:

\`\`\`bash
pre-commit install
pre-commit autoupdate
pre-commit run --all-files  # one-time cleanup
\`\`\`

### Hooks included
- Black (formatter)
- isort (import sorter)
- flake8 (linter)
- YAML/JSON/whitespace checks
- ESLint (manual stage, for frontend)

---

## 5️⃣ Frontend Setup

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Vite will start on http://localhost:5173 and proxy `/api/v1/*` to the FastAPI backend.

---

## 6️⃣ Docker Stack

\`\`\`bash
docker compose -f infra/docker-compose.yml up -d
curl -s http://localhost:8000/api/v1/health
\`\`\`

That should return a `{"status": "ok"}` or similar.

---

## 7️⃣ VS Code Workspace

Shared settings live in `.vscode/`:

- **`settings.json`** — Black on save, ESLint + Prettier wired up
- **`extensions.json`** — Recommends all core extensions

Install all recommendations:

\`\`\`bash
code --install-extension ms-python.python \
  ms-python.vscode-pylance \
  ms-python.black-formatter \
  ms-python.isort \
  dbaeumer.vscode-eslint \
  esbenp.prettier-vscode \
  bradlc.vscode-tailwindcss \
  ms-azuretools.vscode-docker \
  eamodio.gitlens
\`\`\`

---

## 8️⃣ Common Commands

| Task | Command |
|------|----------|
| Run backend only | `source .venv/bin/activate && uvicorn app.main:app --reload` |
| Run frontend only | `pnpm dev` |
| Run full stack | `docker compose -f infra/docker-compose.yml up -d` |
| Run tests | `pytest` |
| Format all | `black . && isort .` |
| Lint all | `flake8` |
| Run hooks manually | `pre-commit run --all-files` |

---

## ✅ Verified Working Environment
- Python 3.12.3
- Node 22.20.0
- pnpm 10.18.2
- Docker 28.5.1
- Compose v2.40.0
- VS Code 1.105.0
- GitHub CLI 2.45.0

---

### 💡 Tip
Keep your environment identical across machines:
\`\`\`bash
python3 -m venv ~/.venvs/revline && source ~/.venvs/revline/bin/activate
\`\`\`
and reuse this doc for any new workstation setup.
