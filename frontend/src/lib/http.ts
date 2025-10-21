// (2) Generic HTTP helper for Revline (JWT/cookie friendly)

export const API_BASE =
  import.meta.env.VITE_API_BASE?.toString() ??
  (import.meta.env.PROD ? "/api/v1" : "http://localhost:8000/api/v1");

type HttpOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  token?: string | null;         // optional bearer token
  credentials?: RequestCredentials; // e.g. "include"
};

export async function http<T>(path: string, opts: HttpOpts = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...(opts.body ? { "Content-Type": "application/json" } : {}),
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    ...(opts.headers ?? {}),
  };

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: opts.credentials ?? "include", // important for cookie-based auth in prod
  });

  // Parse body safely (JSON or text, handle 204)
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = res.status === 204 ? null : (isJson ? await res.json() : await res.text());

  if (!res.ok) {
    const msg =
      (isJson && (payload as any)?.detail) ||
      (isJson && (payload as any)?.message) ||
      (typeof payload === "string" && payload) ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }

  return (payload as unknown) as T;
}
