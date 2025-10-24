// frontend/src/lib/api/client.ts
type TokenBundle = { accessToken: string; expiresAt: number };

const LS_KEY = "revline_token";
const BASE = "/api/v1";
const SKEW_MS = 90_000;

let accessToken: string | null = null;
let expiresAt = 0;

export function loadTokenFromStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as TokenBundle;
    if (parsed && typeof parsed.accessToken === "string" && typeof parsed.expiresAt === "number") {
      accessToken = parsed.accessToken;
      expiresAt = parsed.expiresAt;
      return;
    }
  } catch {}
  if (typeof raw === "string" && raw.includes(".")) {
    accessToken = raw;
    expiresAt = Date.now() + 5 * 60 * 1000;
    localStorage.setItem(LS_KEY, JSON.stringify({ accessToken, expiresAt }));
    return;
  }
  clearSession();
}

export function saveToken(at: string, ttlSec: number) {
  accessToken = at;
  expiresAt = Date.now() + ttlSec * 1000 - SKEW_MS;
  localStorage.setItem(LS_KEY, JSON.stringify({ accessToken: at, expiresAt }));
}

export function clearSession() {
  accessToken = null;
  expiresAt = 0;
  localStorage.removeItem(LS_KEY);
}

function haveValidToken() {
  if (!accessToken || !expiresAt) return false;
  return Date.now() + SKEW_MS < expiresAt;
}

let refreshingPromise: Promise<boolean> | null = null;
async function refreshOnce(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const data: { access_token: string; expires_in: number } = await res.json();
      saveToken(data.access_token, data.expires_in);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();
  return refreshingPromise;
}

function buildApiUrl(p: string): string {
  if (!p) throw new Error("http(): path is required");
  if (p.startsWith("http")) throw new Error("Absolute URLs are not allowed");
  if (p.startsWith(BASE)) return p;
  if (p.startsWith("/")) return `${BASE}${p}`;
  return `${BASE}/${p}`;
}

async function fetchWithRefresh(path: string, init: RequestInit = {}): Promise<Response> {
  if (!accessToken) loadTokenFromStorage();
  if (!haveValidToken()) await refreshOnce();

  const url = buildApiUrl(path);
  const headers = new Headers(init.headers || {});
  const isLogin = url.includes("/auth/login");
  const isRefresh = url.includes("/auth/refresh");
  const isLogout = url.includes("/auth/logout");
  const shouldAttachBearer = !isLogin && !isRefresh && !isLogout;

  if (shouldAttachBearer && haveValidToken()) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401 && shouldAttachBearer) {
    const ok = await refreshOnce();
    if (ok && haveValidToken()) {
      headers.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
    }
  }
  return res;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type HttpOptions = Omit<RequestInit, "body"> & { body?: any; rawBody?: boolean };

async function http(path: string, opts: HttpOptions = {}): Promise<Response> {
  const method = ((opts.method || "GET") as HttpMethod).toUpperCase() as HttpMethod;
  const isGetLike = method === "GET" || method === "HEAD";
  const usingRaw = opts.rawBody === true;

  const headers = new Headers(opts.headers || {});
  const init: RequestInit = { ...opts, method, headers, credentials: "include" };

  if (!isGetLike && !usingRaw) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (typeof opts.body !== "undefined" && !(opts.body instanceof FormData)) {
      (init as any).body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    }
  }
  return fetchWithRefresh(path, init);
}

// Optional shim until all callers are migrated
export const apiFetch = (path: string, init: RequestInit = {}) => http(path, init);

export { http };           // named
export default http;       // default

// JSON helper that uses the existing token/refresh flow
export async function apiJson<T = unknown>(path: string, opts: HttpOptions = {}): Promise<T> {
  const res = await http(path, opts);

  if (!res.ok) {
    // Try to surface API error details if present
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      const body = await res.json().catch(() => null) as any;
      const msg = (body && (body.detail || body.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Handle no-content or non-JSON gracefully
  const ctype = res.headers.get("content-type") || "";
  if (res.status === 204) return undefined as unknown as T;
  if (!ctype.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Expected JSON response");
  }

  return res.json() as Promise<T>;
}
