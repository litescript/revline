import axios from "axios";

// Prefer env if set; fallback to localhost:8000 so we don't depend on dev proxy
const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" }
});
