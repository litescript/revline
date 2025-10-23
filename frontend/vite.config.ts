// frontend/vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Accept both env names for flexibility with compose
  const inDocker = (env.IN_DOCKER ?? env.VITE_IN_DOCKER ?? "0") === "1";

  return {
    cacheDir: "node_modules/.vite-cache",
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: true, // listen on 0.0.0.0 in container
      port: Number(process.env.VITE_PORT) || 5173,
      strictPort: true,
      // Proxy /api/* → FastAPI (preserve full /api/v1 path; NO rewrite)
      proxy: {
        "^/api(/|$)": {
          target: inDocker ? "http://api:8000" : "http://localhost:8000",
          changeOrigin: true,
          secure: false,
          // IMPORTANT: do not rewrite—backend expects /api/v1/*
        },
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    // ✅ Vitest config
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
      },
    },
  };
});
