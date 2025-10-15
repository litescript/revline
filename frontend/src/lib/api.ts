import createClient from 'openapi-fetch';
// import type { paths } from '@/__generated__/openapi';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, '') || '/api';

export const client = createClient</* paths */ any>({
  baseUrl: API_BASE,
});

// back-compat alias for places that import { api }
export const api = client as any;

export async function getHealth() {
  return (client as any).GET('/v1/health', {} as any); // -> /api/v1/health
}
