// frontend/src/lib/auth.ts

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
 * Server response for /auth/login
 */
interface LoginResponse {
  accessToken: string;
  ttl: number; // seconds until expiry
  user: User;
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
 * - return User
 *
 * Throws AppError (from api layer) if credentials are invalid
 * or backend unreachable.
 */
export async function login(email: string, password: string): Promise<User> {
  const data = await api.post<
    LoginResponse,
    { email: string; password: string }
  >("/auth/login", {
    email,
    password,
  });

  saveToken(data.accessToken, data.ttl);
  cachedUser = data.user;
  return data.user;
}

/**
 * Hard logout.
 * We attempt to tell the backend, but we *always* clear client state.
 */
export async function logout(): Promise<void> {
  try {
    // Adjust verb/URL to match backend (POST vs DELETE etc).
    await api.post<unknown, Record<string, never>>("/auth/logout", {});
  } catch (err) {
    // Swallow network/API errors on logout: local state still gets cleared.
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
 * - Throws AppError (which Query layer can catch/handle) for real server errors
 */
export async function fetchCurrentUser(): Promise<User | null> {
  // If we already have a cached user, don't refetch.
  if (cachedUser) return cachedUser;

  // If we don't have a locally valid token, don't even ask the server.
  if (!hasValidSessionLocally()) {
    return null;
  }

  try {
    const me = await api.get<User>("/auth/me");
    cachedUser = me;
    return me;
  } catch (err: unknown) {
    // 'api.get' will have thrown an AppError
    if (isAppError(err) && err.status === 401) {
      // expected: expired/invalid auth
      clearSession();
      cachedUser = null;
      return null;
    }
    // if it's something else (e.g. 500), let caller / Query handle
    throw err;
  }
}

/**
 * Synchronous access to current in-memory user for quick UI checks.
 */
export function getUser(): User | null {
  return cachedUser;
}

/**
 * Quick local check if we *appear* to have an auth token we consider usable.
 * (Not a guarantee the server will still honor it — for that, call fetchCurrentUser.)
 */
export function isAuthenticated(): boolean {
  return hasValidSessionLocally();
}
