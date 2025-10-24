// frontend/src/features/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, clearSession, loadTokenFromStorage, saveToken } from "@/lib/api/client";
import { toast } from "sonner";
import { Navigate, useLocation } from "react-router-dom";

export type User = { id: number; email: string; name: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, opts?: { silent?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Normalize apiFetch to JSON, whether it returns a Response or already-parsed JSON.
async function apiJson<T = unknown>(path: string, init?: RequestInit | Record<string, any>): Promise<T> {
  const r: any = await apiFetch(path, init as any);
  // If this looks like a native Response, handle ok/json/text:
  if (r && typeof r === "object" && typeof r.json === "function") {
    if (!r.ok) {
      let msg = `Request failed (${r.status})`;
      try {
        const ct = r.headers?.get?.("content-type") || "";
        const txt = await r.text();
        if (ct.includes("application/json")) {
          const j = JSON.parse(txt || "{}");
          msg = j?.detail || j?.message || msg;
        } else if (txt) {
          msg = txt.slice(0, 200);
        }
      } catch {
        /* ignore parse errors */
      }
      throw new Error(msg);
    }
    return (await r.json()) as T;
  }
  // Otherwise assume it's already parsed JSON:
  return r as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Internal helpers ----
  async function fetchMe() {
    const data = await apiJson<User>("/auth/me");
    setUser(data);
  }

  // ---- Login flow (via shared client; prefixes /api/v1, includes credentials) ----
  const login = async (email: string, password: string, opts?: { silent?: boolean }) => {
    // Call login and parse JSON (apiJson handles Response vs parsed)
    const data: any = await apiJson("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    // Accept common token shapes
    const token =
      data?.access_token ??
      data?.token ??
      (typeof data === "string" ? data : null);

    // Accept common expiry shapes (seconds)
    const ttlSec: number =
      Number(data?.expires_in ?? data?.expires ?? 3600); // fallback 1h

    if (!token) {
      throw new Error("Login did not return an access token");
    }

    // Persist for the shared client (adds Authorization on next requests)
    saveToken(token, ttlSec);

    await fetchMe(); // now bears Authorization
    if (!opts?.silent) {
      toast.success(`Welcome back, ${email}!`);
    }
  };

  // ---- Logout ----
  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" } as any);
    } catch {
      /* ignore */
    }
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
