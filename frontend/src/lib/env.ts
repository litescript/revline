// src/lib/env.ts
// Centralize env access; keeps future validation in one spot.
export const ENV = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL?.toString() ||
    (typeof window !== "undefined" ? window.location.origin : ""),

  // Auth refresh threshold (minutes before expiry to trigger refresh)
  REFRESH_THRESHOLD_MINUTES: parseInt(
    import.meta.env.VITE_REFRESH_THRESHOLD_MINUTES || "5",
    10
  ),
};
