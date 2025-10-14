// src/lib/env.ts
// Centralize env access; keeps future validation in one spot.
export const ENV = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL?.toString() ||
    (typeof window !== "undefined" ? window.location.origin : ""),
};
