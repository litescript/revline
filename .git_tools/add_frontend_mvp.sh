# save as: tools/add_frontend_mvp.sh
# usage: bash tools/add_frontend_mvp.sh
set -euo pipefail

branch="feat/frontend-mvp"

# --- guardrails ---
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this from the repo root (a git work tree)"; exit 1
fi
if [ -e frontend/src ] || [ -e frontend/package.json ]; then
  echo "frontend/ already exists — aborting to avoid overwrite."; exit 1
fi

# --- branch ---
git fetch origin main || true
git switch -c "$branch" origin/main || git switch -c "$branch"

mkdir -p frontend/src/{components,lib,pages} infra

# --- env & ignores ---
cat > frontend/.env.example <<'EOF'
# Base URL of Revline backend (no trailing slash)
VITE_API_BASE_URL=http://localhost:8000
EOF

cat > frontend/.gitignore <<'EOF'
node_modules
dist
.vite
.env
.env.local
EOF

# --- package.json (frontend only) ---
cat > frontend/package.json <<'EOF'
{
  "name": "revline-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173",
    "lint": "eslint ."
  },
  "dependencies": {
    "@tanstack/react-query": "^5.56.2",
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.2",
    "vite": "^5.4.8"
  }
}
EOF

# --- Vite/Tailwind/TS config ---
cat > frontend/vite.config.ts <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }
});
EOF

cat > frontend/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
EOF

cat > frontend/postcss.config.js <<'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
EOF

cat > frontend/tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
} satisfies Config;
EOF

cat > frontend/index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Revline</title>
  </head>
  <body class="bg-gray-50 text-gray-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat > frontend/src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
EOF

# --- Lib ---
cat > frontend/src/lib/api.ts <<'EOF'
import axios from "axios";

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" }
});
EOF

cat > frontend/src/lib/queryClient.ts <<'EOF'
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000
    }
  }
});
EOF

# --- Components & Pages ---
cat > frontend/src/components/Navbar.tsx <<'EOF'
import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-gray-200" : "hover:bg-gray-100"
    }`;

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">Revline</Link>
        <div className="flex gap-2">
          <NavLink to="/" className={linkCls} end>Dashboard</NavLink>
          <NavLink to="/health" className={linkCls}>Health</NavLink>
        </div>
      </nav>
    </header>
  );
}
EOF

cat > frontend/src/components/HealthStatus.tsx <<'EOF'
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

type HealthResponse = {
  status: string;
  uptime?: number;
  version?: string;
};

export default function HealthStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<HealthResponse>("/api/v1/health")).data
  });

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backend Health</h2>
        <button
          onClick={() => refetch()}
          className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mt-3">
        {isLoading && <p>Loading…</p>}
        {isError && (
          <p className="text-red-600">
            Cannot reach backend at /api/v1/health. Check CORS and VITE_API_BASE_URL.
          </p>
        )}
        {data && (
          <div className="space-y-1">
            <p><span className="font-medium">Status:</span> {data.status}</p>
            {data.version && (
              <p><span className="font-medium">Version:</span> {data.version}</p>
            )}
            {typeof data.uptime === "number" && (
              <p><span className="font-medium">Uptime:</span> {Math.round(data.uptime)}s</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
EOF

cat > frontend/src/pages/Home.tsx <<'EOF'
export default function Home() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold mb-3">Dashboard</h1>
      <p className="text-gray-700">
        Welcome to Revline. Use the Health tab to verify end-to-end connectivity.
      </p>
    </div>
  );
}
EOF

cat > frontend/src/pages/Health.tsx <<'EOF'
import HealthStatus from "../components/HealthStatus";

export default function Health() {
  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">System Health</h1>
      <HealthStatus />
    </div>
  );
}
EOF

cat > frontend/src/App.tsx <<'EOF'
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Health from "./pages/Health";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/health" element={<Health />} />
      </Routes>
    </div>
  );
}
EOF

cat > frontend/src/main.tsx <<'EOF'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
EOF

# --- Dockerfile (frontend) ---
cat > frontend/Dockerfile <<'EOF'
# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY . .
RUN npm run build

# Serve static
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
EOF

# --- compose (add frontend service if infra/docker-compose.yml missing or minimal) ---
if [ ! -f infra/docker-compose.yml ]; then
  cat > infra/docker-compose.yml <<'EOF'
services:
  backend:
    # define or keep in existing compose
    # ports: ["8000:8000"]
  frontend:
    build:
      context: ../frontend
    image: revline/frontend:0.1.0
    container_name: revline-frontend
    restart: unless-stopped
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://host.docker.internal:8000}
    ports:
      - "5173:5173"
    networks:
      - revline
networks:
  revline:
    driver: bridge
EOF
fi

# --- commit & push ---
git add frontend infra/docker-compose.yml || true
git commit -m "feat(frontend): add React+Vite+TanStack+Tailwind MVP scaffold"
git push -u origin "$branch"

echo
echo "Done. Open a PR from $branch -> main."
echo "Local dev:"
echo "  cd frontend && cp .env.example .env.local && npm i && npm run dev"
echo "Docker:"
echo "  docker compose -f infra/docker-compose.yml up -d --build frontend"
