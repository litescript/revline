// frontend/src/lib/api/client.ts

import {
  AppError,
  networkErrorToAppError,
  responseToAppError,
} from "@/lib/query/error";

const LS_KEY = "revline_token";
const BASE = "/api/v1"; // single source of truth for backend base path
const SKEW_MS = 90_000; // expire ~90s early to avoid edge-rollover

export type TokenBundle = {
  accessToken: string;
  expiresAt: number; // epoch millis
};

// in-memory cache mirrors localStorage so we don't parse JSON constantly
let accessToken: string | null = null;
let expiresAt = 0;

/* -------------------------------------------------
 * Token lifecycle
 * ------------------------------------------------- */

/**
 * Validate that a candidate bundle is well-formed and not already expired.
 * We do NOT "try our best" with garbage here. If it's wrong, we drop session.
 */
function isValidBundle(maybe: unknown): maybe is TokenBundle {
  if (!maybe || typeof maybe !== "object") return false;
  const b = maybe as Partial<TokenBundle>;
  if (typeof b.accessToken !== "string") return false;
  if (typeof b.expiresAt !== "number") return false;
  // must still be valid >5s from now
  if (b.expiresAt <= Date.now() + 5000) return false;
  return true;
}

/**
 * Load token from localStorage into memory.
 * Call this once on app start.
 */
export function loadTokenFromStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (isValidBundle(parsed)) {
      accessToken = parsed.accessToken;
      expiresAt = parsed.expiresAt;
    } else {
      // corrupted / stale / nonsense
      clearSession();
    }
  } catch {
    clearSession();
  }
}

/**
 * Save token from a login or refresh response.
 * We apply an early-expire skew so we don't cut it too close.
 */
export function saveToken(token: string, ttlSec: number) {
  accessToken = token;
  expiresAt = Date.now() + ttlSec * 1000 - SKEW_MS;

  // only persist if it still passes validation after skew
  const bundle: TokenBundle = { accessToken, expiresAt };
  if (!isValidBundle(bundle)) {
    // if ttl was tiny or bogus, treat as invalid auth instead of storing junk
    clearSession();
    return;
  }

  localStorage.setItem(LS_KEY, JSON.stringify(bundle));
}

/**
 * Hard logout / session nuke.
 */
export function clearSession() {
  accessToken = null;
  expiresAt = 0;
  localStorage.removeItem(LS_KEY);
}

/**
 * Ensure we are not holding a dead/expired token.
 * If token is missing or expired, we clear it.
 */
function ensureFreshToken() {
  if (!accessToken) return;
  if (Date.now() > expiresAt) {
    clearSession();
  }
}

/**
 * Is the current in-memory token considered usable?
 * (This does NOT prove server will accept it, but lets UI make fast decisions.)
 */
export function hasValidSessionLocally(): boolean {
  ensureFreshToken();
  return !!accessToken;
}

/* -------------------------------------------------
 * Core request primitive
 * ------------------------------------------------- */

/**
 * Perform an API request against our backend.
 * Success path:
 *   - returns parsed JSON (or `undefined` for 204)
 *
 * Failure path:
 *   - throws AppError with status/code/message/retryable
 *
 * We NEVER throw raw Error or Response.
 */
async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  ensureFreshToken();

  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  // only set Content-Type for methods that carry a body
  const method = (init.method || "GET").toUpperCase();
  const needsContentType =
    method !== "GET" &&
    method !== "HEAD" &&
    !headers.has("Content-Type");
  if (needsContentType) {
    headers.set("Content-Type", "application/json");
  }

  // include Authorization header if we still think we're logged in
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch (err: unknown) {
    // Network failure before we even got a Response
    throw networkErrorToAppError(err);
  }

  // Session expired or invalid credentials. Clear immediately.
  if (res.status === 401) {
    clearSession();
  }

  // Non-2xx/3xx is an error
  if (!res.ok) {
    throw await responseToAppError(res);
  }

  // Handle explicit no-content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  // We expect JSON. If we can't parse it, that's on the server.
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const appErr: AppError = {
      status: res.status,
      code: "decode_error",
      message: text || "Expected JSON response",
      retryable: true
    };
    throw appErr;
  }

  try {
    return (await res.json()) as T;
  } catch {
    const appErr: AppError = {
      status: res.status,
      code: "decode_error",
      message: "Invalid JSON from server",
      retryable: true
    };
    throw appErr;
  }
}

/* -------------------------------------------------
 * Public API surface
 * ------------------------------------------------- */

export const api = {
  get<T>(url: string, init?: RequestInit) {
    return request<T>(url, { method: "GET", ...(init || {}) });
  },

  post<T, B = unknown>(url: string, body: B, init?: RequestInit) {
    return request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
      ...(init || {}),
    });
  },

  put<T, B = unknown>(url: string, body: B, init?: RequestInit) {
    return request<T>(url, {
      method: "PUT",
      body: JSON.stringify(body),
      ...(init || {}),
    });
  },

  patch<T, B = unknown>(url: string, body: B, init?: RequestInit) {
    return request<T>(url, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...(init || {}),
    });
  },

  delete<T>(url: string, init?: RequestInit) {
    return request<T>(url, { method: "DELETE", ...(init || {}) });
  },
};
