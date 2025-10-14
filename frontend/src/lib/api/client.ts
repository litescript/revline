// src/lib/api/client.ts
import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Runtime base URL from Vite env. Falls back to window origin (same-origin).
const baseUrl =
  import.meta.env.VITE_API_BASE_URL?.toString() ||
  (typeof window !== "undefined" ? window.location.origin : "");

// Shared client instance (fetch can be swapped if needed)
export const api = createClient<paths>({ baseUrl });

// Handy helpers for common methods
export const get = api.GET;
export const post = api.POST;
export const put = api.PUT;
export const patch = api.PATCH;
export const del = api.DELETE;
