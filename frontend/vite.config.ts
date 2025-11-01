import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const inDocker = env.VITE_IN_DOCKER === "1"; // set in compose for the web container

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
      port: 5174,
      strictPort: true,
      proxy: {
        "^/api(/|$)": {
          target: inDocker ? "http://api:8000" : "http://localhost:8000",
          changeOrigin: true,
          secure: false,
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
        reporter: ["text", "json-summary", "lcov"],
      },
    },
  };
});
