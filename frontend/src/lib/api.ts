import createClient from 'openapi-fetch';
// import type { paths } from '@/__generated__/openapi'; // wire up when ready

const API_BASE = (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, '') || '/api';

export const client = createClient</* paths */ any>({
  baseUrl: API_BASE, // '/api' in dev/prod proxies → '/api/v1/...'
});

export async function getHealth() {
  return client.GET('/v1/health'); // resolves to /api/v1/health
}
