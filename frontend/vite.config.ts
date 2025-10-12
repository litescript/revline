import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const inDocker = env.VITE_IN_DOCKER === "1"; // set in compose for the web container

  return {
    cacheDir: ".vite-cache",
    plugins: [react()],
    server: {
      host: true,           // listen on 0.0.0.0 in container
      port: 5174,
      strictPort: true,
      proxy: {
        // keep /api prefix; works in both dev + prod (nginx also expects /api/*) NOTE: TRYING OLD API SEARCH
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
  };
});
