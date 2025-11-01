// ==============================
// frontend/src/lib/auth.ts
// ==============================

import {
  api,
  saveToken,
  clearSession,
  hasValidSessionLocally,
} from "@/lib/api/client";
import { isAppError } from "@/lib/query/error";

/**
 * Canonical user object type from backend.
 */
export interface User {
  id: number;
  email: string;
  name: string;
}

/**
 * Server response for /auth/login (tolerate multiple shapes)
 * - Your backend currently returns: { access_token, token_type, expires_in }
 * - Older/alt shapes are also accepted defensively.
 */
type LoginResponse =
  | {
      access_token: string;
      token_type?: string;
      expires_in?: number;
      user?: User; // not currently returned, but allowed
    }
  | {
      accessToken: string; // old client shape
      ttl?: number;
      user?: User;
    }
  | {
      token?: { access?: string; refresh?: string };
      access?: string;
      refresh?: string;
      ttl?: number;
      expires_in?: number;
      user?: User;
    };

/** Extract an access token from any supported response shape */
function extractAccessToken(data: LoginResponse): string | null {
  // current backend
  // @ts-expect-error (narrowing union safely at runtime)
  if (typeof data?.access_token === "string") return data.access_token;
  // old client
  // @ts-expect-error
  if (typeof data?.accessToken === "string") return data.accessToken;
  // nested token object
  // @ts-expect-error
  if (typeof data?.token?.access === "string") return data.token.access;
  // flat access
  // @ts-expect-error
  if (typeof data?.access === "string") return data.access;
  return null;
}

/** Extract TTL (seconds) or default to 3600 if not provided */
function extractTtlSeconds(data: LoginResponse): number {
  // @ts-expect-error
  if (typeof data?.ttl === "number") return data.ttl;
  // @ts-expect-error
  if (typeof data?.expires_in === "number") return data.expires_in;
  return 3600;
}

/**
 * Local in-memory cache of current user.
 * This avoids redundant /auth/me fetches during normal operation.
 */
let cachedUser: User | null = null;

/* -------------------------------------------------
 * Authentication lifecycle
 * ------------------------------------------------- */

/**
 * Perform login with email + password.
 * - POST /auth/login
 * - save token
 * - fetch /auth/me if user not included
 * - return User
 *
 * Throws AppError if credentials are invalid or backend unreachable.
 */
export async function login(email: string, password: string): Promise<User> {
  const data = await api.post<LoginResponse, { email: string; password: string }>(
    "/auth/login",
    { email, password }
  );

  const access = extractAccessToken(data);
  if (!access) {
    throw new Error("Login succeeded but no access token was returned.");
  }
  const ttl = extractTtlSeconds(data);

  // Persist token for the request interceptor / route guard
  saveToken(access, ttl);

  // Prefer user from payload if present; otherwise fetch it
  const inlineUser: User | undefined = data?.user;
  if (inlineUser && inlineUser.id) {
    cachedUser = inlineUser;
    return inlineUser;
  }

  const me = await api.get<User>("/auth/me");
  cachedUser = me;
  return me;
}

/**
 * Hard logout.
 * We attempt to tell the backend, but we *always* clear client state.
 */
export async function logout(): Promise<void> {
  try {
    await api.post<unknown, Record<string, never>>("/auth/logout", {});
  } catch (err) {
    if (isAppError(err)) {
      console.warn("Logout API failed:", err.message);
    } else {
      console.warn("Unexpected logout error", err);
    }
  }

  clearSession();
  cachedUser = null;
}

/**
 * Retrieve current user info from backend.
 * - Returns User on success
 * - Returns null if unauthenticated (401)
 * - Throws AppError for server errors
 */
export async function fetchCurrentUser(): Promise<User | null> {
  if (cachedUser) return cachedUser;

  if (!hasValidSessionLocally()) {
    return null;
  }

  try {
    const me = await api.get<User>("/auth/me");
    cachedUser = me;
    return me;
  } catch (err: unknown) {
    if (isAppError(err) && err.status === 401) {
      clearSession();
      cachedUser = null;
      return null;
    }
    throw err;
  }
}

/** Synchronous access to current in-memory user */
export function getUser(): User | null {
  return cachedUser;
}

/** Quick local check for a usable auth token */
export function isAuthenticated(): boolean {
  return hasValidSessionLocally();
}
