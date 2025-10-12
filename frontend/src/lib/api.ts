import axios from "axios";

// Prefer relative base (works with nginx proxy). If explicitly set, use env.
const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const baseURL = envBase ?? ""; // "" keeps requests relative to current origin

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" }
});
