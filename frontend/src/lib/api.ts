import createClient from 'openapi-fetch';
// import type { paths } from '@/__generated__/openapi';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, '') || '/api';

export const client = createClient</* paths */ any>({
  baseUrl: API_BASE,
});

// Back-compat alias (some files might import { api })
export const api = client as any;

// Helpers
export async function getHealth() {
  // Force 2nd arg to satisfy stricter signatures in some setups
  return (client as any).GET('/v1/health', {} as any); // => /api/v1/health
}
