// frontend/src/lib/api/client.ts
/**
 * Revline unified HTTP client (fetch-compatible)
 * - Hard-locks base path to /api/v1 (no absolute URLs)
 * - Always credentials: "include"
 * - Single-flight refresh with skew and 401 retry
 * - Returns a native Response (so existing code using res.ok/res.json() keeps working)
 */

type TokenBundle = { accessToken: string; expiresAt: number };

const LS_KEY = "revline_token";
const BASE = "/api/v1"; // enforce relative base-path

// Module-scoped session cache
let accessToken: string | null = null;
let expiresAt = 0; // epoch millis

// Refresh early to avoid edge races
const SKEW_MS = 90_000;

/* -------------------- session helpers -------------------- */
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
  } catch {
    // fall through
  }

  // Legacy: bare JWT string — migrate once
  if (typeof raw === "string" && raw.includes(".")) {
    accessToken = raw;
    expiresAt = Date.now() + 5 * 60 * 1000; // short soft-ttl
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

function haveValidToken(): boolean {
  if (!accessToken || !expiresAt) return false;
  return Date.now() + SKEW_MS < expiresAt;
}

/* -------------------- refresh (single-flight) -------------------- */
let refreshingPromise: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include", // HttpOnly cookie
      });
      if (!res.ok) {
        if (import.meta.env.DEV) console.debug("[api] refresh failed:", res.status);
        clearSession();
        return false;
      }
      const data: { access_token: string; expires_in: number } = await res.json();
      saveToken(data.access_token, data.expires_in);
      if (import.meta.env.DEV) console.debug("[api] refresh OK");
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.debug("[api] refresh network error:", err);
      clearSession();
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
}

/* -------------------- core fetch with pre-refresh & 401 retry -------------------- */
function buildApiUrl(p: string): string {
  if (!p) throw new Error("http(): path is required");
  if (p.startsWith("http")) throw new Error("Absolute URLs are not allowed in frontend requests");
  if (p.startsWith(BASE)) return p;
  if (p.startsWith("/")) return `${BASE}${p}`;
  return `${BASE}/${p}`;
}

async function fetchWithRefresh(path: string, init: RequestInit = {}): Promise<Response> {
  if (!accessToken) loadTokenFromStorage();

  if (!haveValidToken()) {
    await refreshOnce(); // still attempt call even if false
  }

  const url = buildApiUrl(path);
  const headers = new Headers(init.headers || {});

  // Endpoints that should NOT receive Authorization
  const isLogin = url.includes("/auth/login");
  const isRefresh = url.includes("/auth/refresh");
  const isLogout = url.includes("/auth/logout");
  const shouldAttachBearer = !isLogin && !isRefresh && !isLogout;

  if (shouldAttachBearer && haveValidToken()) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (import.meta.env.DEV) console.debug("[api] →", init.method ?? "GET", url);

  let res = await fetch(url, { ...init, headers, credentials: "include" });

  if (import.meta.env.DEV) console.debug("[api] ←", res.status, url);

  if (res.status === 401 && shouldAttachBearer) {
    const ok = await refreshOnce();
    if (ok && haveValidToken()) {
      headers.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
      if (import.meta.env.DEV) console.debug("[api] ← retry", res.status, url);
    }
  }

  return res;
}

/* -------------------- public http(): fetch-compatible -------------------- */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
export type HttpOptions = Omit<RequestInit, "body"> & {
  /** Allow plain objects; will be JSON-stringified unless rawBody=true. */
  body?: any;
  /** When true, do not set JSON headers or stringify body. */
  rawBody?: boolean;
};

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

// Default + named export
export { http };
export default http;
