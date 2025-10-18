// (2) Generic HTTP helper for Revline (JWT-based)

export const API_BASE =
  import.meta.env.VITE_API_BASE?.toString() || "/api/v1";

type HttpOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  token?: string | null;
};

export async function http<T>(path: string, opts: HttpOpts = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  const isJSON = res.headers.get("content-type")?.includes("application/json");
  const data = isJSON ? await res.json() : (null as any);
  if (!res.ok) {
    const msg = data?.detail || data?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}
