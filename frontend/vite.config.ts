import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  cacheDir: ".vite-cache",     // <- avoid old root-owned .vite
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "^/api(/|$)": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
