import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, saveToken, clearSession, loadTokenFromStorage } from "@/lib/api/client";
import { toast } from "sonner";
import { http } from "@/lib/http";

export type User = { id: number; email: string; name: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, opts?: { silent?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Internal helpers ----
  async function fetchMe() {
    const res = await apiFetch("/auth/me");
    if (!res.ok) throw new Error("me failed");
    const data: User = await res.json();
    setUser(data);
  }

  // ---- Login flow ----
  const login = async (email: string, password: string, opts?: { silent?: boolean }) => {
    // let the shared http() handle fetch, headers, and errors
    const { access_token, expires_in } = await http<{ access_token: string; expires_in: number }>(
      "/auth/login",
      {
        method: "POST",
        body: { email, password },
      }
    );

    saveToken(access_token, expires_in);

    // fetch profile using the fresh token so we don't depend on apiFetch pick-up timing
    const meData = await http<User>("/auth/me", { token: access_token });
    setUser(meData);

    if (!opts?.silent) {
      toast.success(`Welcome back, ${email}!`);
    }
  };

  // ---- Logout ----
  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    clearSession();
    setUser(null);
    toast(`Signed out`, { description: "See you next time!" });
  };

  // ---- Refresh user manually (e.g., from UI) ----
  const refreshMe = async () => {
    await fetchMe();
  };

  // Cold start: try to restore session token and load user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        loadTokenFromStorage();
        await fetchMe();
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug("[AuthProvider] Session restore failed:", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
 
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ---- Guard for protected routes ----
import { Navigate, useLocation } from "react-router-dom";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-sm text-muted-foreground">Loading session…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
