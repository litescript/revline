// ==============================
// frontend/src/lib/env.ts
// ==============================
// Centralize env access; keeps future validation in one spot.
export const ENV = {
  // Accept both names; fall back to API on :8000 in dev
  API_BASE_URL:
    (import.meta.env.VITE_API_BASE as string | undefined)?.toString() ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.toString() ||
    'http://localhost:8000/api/v1',
};
