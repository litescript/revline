import { useAuth } from "@/features/auth/AuthProvider";
import type { User } from "@/lib/auth";

/**
 * Sprint 5B compatibility layer.
 *
 * Old code expected `useUser()` to be "the way to know who is logged in",
 * and some code even assumed it might still be loading.
 *
 * After Sprint 5B:
 * - AuthProvider owns session bootstrap and keeps the current user in memory.
 * - `useAuth()` exposes that state.
 *
 * So `useUser()` just forwards the relevant slice from `useAuth()`
 * so we don't have to rewrite every caller right now.
 */
export function useUser(): {
  user: User | null;
  loading: boolean;
} {
  const { user, loading } = useAuth();
  return { user, loading };
}
