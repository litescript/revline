import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // use the Compose service name, not localhost
      "/api": { target: "http://api:8000", changeOrigin: true }
    }
  }
});
