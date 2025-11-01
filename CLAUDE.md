# 🧠 CLAUDE.md — Revline Project Context & Workflow Guide

## 🏁 Project Overview
**Project:** Revline  
**Owner:** Peter (`atlas` acts as co-lead dev)  
**Purpose:** Modern automotive dealership / shop-management SaaS inspired by ERA Ignite & Autopoint MPI.

### 🧩 Architecture Summary
| Layer | Stack |
|:------|:------|
| Frontend | React 19 • Vite 5 • TypeScript 5.9 • TanStack Query • Tailwind 4 |
| Backend | FastAPI • SQLAlchemy 2 • PostgreSQL 16 • Redis 7 |
| Infra | Docker Compose (dev / prod profiles) • Nginx (prod) |
| Standards | Strict TypeScript (`noImplicitAny`, `strictNullChecks`) • NASA-grade error discipline |

### 🔐 Core Principles
- **Type Safety First** — no implicit `any`, no untyped fetches.  
- **Unified API Layer** — all network calls through `api.get` / `api.post` returning typed data or `AppError`.  
- **Predictable Queries** — React Query via `AppQueryProvider` with global retry + toast policy.  
- **Auth Flow** — centralized in `AuthProvider` (`loginWithCredentials`, `logoutUser`, `refreshMe`).  
- **Never Commit Blindly** — every AI-assisted proposal is reviewed, discussed, and merged deliberately.  

---

## 🤖 Claude Code Workflow
Claude acts as a **code-review and architecture assistant** — *not* a direct code writer.

When analyzing or proposing changes Claude must:
1. **Never modify or commit code directly.**  
2. **Always create** a Markdown file named `suggested-changes.md` at repo root containing:  
   - **Summary** – issues or opportunities found  
   - **Proposed Changes** – code blocks or diffs  
   - **Reasoning** – why the change improves safety or clarity  
   - **Questions** – clarifications needed from maintainers  

### Formatting Rules
- Use fenced code blocks with filenames for context, for example:

```ts filename=frontend/src/hooks/useUser.ts
export function useUser() { … }
```

- Prefer unified `diff` style for large edits.  
- Keep tone concise and technical; ask instead of assuming design intent.  

### Claude must **not**
- edit config, Docker, or CI files unless explicitly requested,  
- execute shell commands, or  
- auto-apply patches.  

---

## 🧭 Example Usage
From repo root after `/init`:

```bash
claude /ask "We are refactoring the Active RO Board to use the new API layer. 
Inspect frontend/src/features/ros/*.tsx and frontend/src/hooks/*.ts. 
Generate suggested-changes.md with code diffs, reasoning, and open questions."
```

Claude outputs `suggested-changes.md`; then `atlas` and `peter` review before implementation.

---

## ⚙️ Session Reminder Prompt
After running `/init`, paste once per session:

> **Context Reminder:**  
> Operate under CLAUDE.md workflow.  
> Write all findings to `suggested-changes.md`.  
> Use diff-style fenced code blocks and include reasoning + questions.  
> Do not auto-execute or commit changes.

---

## 📁 Optional Output Directory
To archive multiple iterations:

```bash
mkdir -p docs/claude
```
Save outputs as `docs/claude/suggested-changes-YYYY-MM-DD.md`.

---

## 🚫 Ignore List (Skip These Paths)
Claude should ignore the following for context efficiency:

```
node_modules/
dist/
build/
.venv/
__pycache__/
.env
.env.*
*.log
*.sqlite3
frontend/.vite/
frontend/.turbo/
frontend/.cache/
infra/nginx/logs/
infra/pg_data/
infra/redis_data/
.DS_Store
```

---

## ✅ Quality Gate
Before accepting any Claude-generated proposal:
1. `npm run type-check` (frontend) ✅  
2. `pytest` or `docker compose run api pytest` (backend) ✅  
3. `docker compose -f infra/docker-compose.yml up` runs cleanly on 5173 / 8000 ✅  

---

## 🧾 Attribution
This document defines how Claude Pro interacts with Revline.  
Workflow: Claude drafts → Atlas reviews → Peter commits → CI validates.
