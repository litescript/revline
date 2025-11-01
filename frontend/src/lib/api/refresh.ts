// frontend/src/lib/api/refresh.ts

import { api, saveToken } from "./client";
import { ENV } from "@/lib/env";

/**
 * Refresh token response from backend.
 */
interface RefreshResponse {
  access_token: string;
  expires_in: number; // seconds
}

/**
 * Single-flight mutex to prevent concurrent refresh attempts.
 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the refresh cookie.
 *
 * Returns:
 *   - true if refresh succeeded
 *   - false if refresh failed (user should be logged out)
 *
 * This function ensures only one refresh request is in-flight at a time.
 */
export async function attemptSilentRefresh(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh attempt
  refreshPromise = (async () => {
    try {
      const data = await api.post<RefreshResponse, Record<string, never>>(
        "/auth/refresh",
        {}
      );

      // Save new access token
      saveToken(data.access_token, data.expires_in);
      return true;
    } catch (err: unknown) {
      // Refresh failed (likely 401 - refresh token expired/invalid)
      console.warn("Silent refresh failed:", err);

      // Don't toast here - the 401 handler in client.ts will handle it
      return false;
    } finally {
      // Clear the promise so future refreshes can proceed
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Check if we should attempt a silent refresh.
 * Call this before making API requests if token is close to expiry.
 */
export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  const refreshThreshold = ENV.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

  return timeUntilExpiry > 0 && timeUntilExpiry < refreshThreshold;
}
