// frontend/src/features/auth/AuthProvider.tsx
import http from "@/lib/api/client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { saveToken, clearSession, loadTokenFromStorage } from "@/lib/api/client";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    const res = await http("/auth/me");
    if (!res.ok) throw new Error("me failed");
    const data: User = await res.json();
    setUser(data);
  }

  useEffect(() => {
    loadTokenFromStorage();
    (async () => {
      try {
        await fetchMe();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string, opts?: { silent?: boolean }) => {
    // ✅ use http() with relative path; credentials handled inside
    const res = await http("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!res.ok) {
      let msg = "Login failed";
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          msg = j?.detail ?? j?.message ?? msg;
        } else {
          const t = await res.text();
          try {
            const j = JSON.parse(t);
            msg = j?.detail ?? j?.message ?? (t || msg);
          } catch {
            msg = t || msg;
          }
        }
      } catch { /* keep default msg */ }
      throw new Error(msg);
    }

    // If backend returns access token, store it (keeps parity with refresh flow)
    try {
      const j = await res.json().catch(() => null);
      if (j?.access_token && typeof j?.expires_in === "number") {
        saveToken(j.access_token, j.expires_in);
      }
    } catch { /* ignore */ }

    await fetchMe();
    if (!opts?.silent) toast.success("Signed in");
  };

  const logout = async () => {
    try {
      await http("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      setUser(null);
      toast.message("Signed out");
    }
  };

  const refreshMe = async () => {
    await fetchMe();
  };

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
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
