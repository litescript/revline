import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, saveToken, clearSession, loadTokenFromStorage } from "@/lib/api/client";
import { toast } from "sonner";

export type User = { id: number; email: string; name: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    const res = await apiFetch("/auth/me");
    if (!res.ok) throw new Error("me failed");
    const data: User = await res.json();
    setUser(data);
  }

  const login = async (email: string, password: string) => {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Login failed");
  }

  const data = await res.json();
  saveToken(data.access_token, data.expires_in);
  await fetchMe();

  toast.success(`Welcome back, ${email}!`);
};

const logout = async () => {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  clearSession();
  setUser(null);

  toast(`Signed out`, {
    description: "See you next time!",
  });
};


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

  // While we’re restoring session, don’t bounce to /login yet
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-sm text-muted-foreground">Loading session…</div>
      </div>
    );
  }

  // Not authenticated → send to /login and remember where we came from
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
