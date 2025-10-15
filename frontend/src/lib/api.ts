import createClient from 'openapi-fetch';
// import type { paths } from '@/__generated__/openapi'; // add when ready

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, '') || '/api';

export const client = createClient</* paths */ any>({
  baseUrl: API_BASE,
});

export async function getHealth() {
  // resolves to /api/v1/health with baseUrl '/api'
  return client.GET('/v1/health');
}
