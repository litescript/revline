// frontend/src/lib/api/client.ts
type TokenBundle = { accessToken: string; expiresAt: number };
const LS_KEY = "revline_token";
const BASE = import.meta.env.VITE_API_BASE || "/api/v1";

// Module-scoped session cache
let accessToken: string | null = null;
let expiresAt = 0; // epoch millis

// Skew buffer so we refresh a bit early (avoids edge races)
const SKEW_MS = 90_000;

// -------------------- session helpers --------------------
export function loadTokenFromStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  // Happy path: JSON bundle { accessToken, expiresAt }
  try {
    const parsed = JSON.parse(raw) as TokenBundle;
    if (
      parsed &&
      typeof parsed.accessToken === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      accessToken = parsed.accessToken;
      expiresAt = parsed.expiresAt;
      return;
    }
  } catch {
    // fall through to legacy check
  }

  // Legacy: bare JWT string (e.g., "eyJhbGciOi...") — migrate it once
  if (typeof raw === "string" && raw.includes(".")) {
    accessToken = raw;
    // Give a short soft-ttl; refresh() will replace it anyway
    expiresAt = Date.now() + 5 * 60 * 1000;
    localStorage.setItem(LS_KEY, JSON.stringify({ accessToken, expiresAt }));
    return;
  }

  // Unknown / corrupted: clear
  clearSession();
}

export function saveToken(at: string, ttlSec: number) {
  accessToken = at;
  // Use the same skew here so apiFetch never sees a token as "valid" right at the edge.
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
  // Token must be valid at least SKEW_MS into the future.
  return Date.now() + SKEW_MS < expiresAt;
}

// -------------------- refresh (single-flight) --------------------
let refreshingPromise: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise; // single-flight lock

  refreshingPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include", // rely on HttpOnly cookie
      });
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.debug("[api] refresh failed:", res.status);
        }
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
      refreshingPromise = null; // release lock
    }
  })();

  return refreshingPromise;
}

// -------------------- main fetch with pre-refresh & 401 retry --------------------
export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!accessToken) loadTokenFromStorage();

  // Pre-refresh if token missing/expiring soon
  if (!haveValidToken()) {
    await refreshOnce(); // ignore result; still attempt call
  }

  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers = new Headers(init.headers || {});

  // Auth endpoints that should NOT receive Authorization
  const isLogin = url.includes("/auth/login");
  const isRefresh = url.includes("/auth/refresh");
  const isLogout = url.includes("/auth/logout");

  const shouldAttachBearer = !isLogin && !isRefresh && !isLogout;

  if (shouldAttachBearer && haveValidToken()) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (import.meta.env.DEV) {
    console.debug("[api] →", init.method ?? "GET", url);
  }

  let res = await fetch(url, { ...init, headers, credentials: "include" });

  if (import.meta.env.DEV) {
    console.debug("[api] ←", res.status, url);
  }

  // On 401 (for non-auth endpoints), try a single refresh then retry once
  if (res.status === 401 && shouldAttachBearer) {
    const ok = await refreshOnce();
    if (ok && haveValidToken()) {
      headers.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
      if (import.meta.env.DEV) {
        console.debug("[api] ← retry", res.status, url);
      }
    }
  }

  return res;
}
