import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import { Navigate, useLocation } from "react-router-dom";

import {
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  type User,
} from "@/lib/auth";
import { clearSession } from "@/lib/api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  loginWithCredentials: (
    email: string,
    password: string,
    opts?: { silent?: boolean }
  ) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: ask "who am I?"
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await fetchCurrentUser(); // returns User | null
        if (mounted) {
          setUser(me);
        }
      } catch (err) {
        // "hard" failure (not just unauth). We'll treat as signed-out locally.
        console.warn("fetchCurrentUser() failed:", err);
        if (mounted) {
          clearSession();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // login flow
  const loginWithCredentials = useCallback<
    AuthContextValue["loginWithCredentials"]
  >(async (email, password, opts) => {
    try {
      // apiLogin() stores token via saveToken(), caches user, and returns the User
      const signedInUser = await apiLogin(email, password);
      setUser(signedInUser);

      if (!opts?.silent) {
        toast.success("Signed in.");
      }
    } catch (err: any) {
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        "Login failed.";
      if (!opts?.silent) {
        toast.error(msg);
      }
      throw err;
    }
  }, []);

  // logout flow
  const logoutUser = useCallback<AuthContextValue["logoutUser"]>(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn("logout() error (ignored):", err);
    } finally {
      clearSession();
      setUser(null);
      toast.success("Signed out.");
    }
  }, []);

  // force-refresh current user from backend
  const refreshMe = useCallback<AuthContextValue["refreshMe"]>(async () => {
    try {
      const me = await fetchCurrentUser(); // User | null
      if (me) {
        setUser(me);
      } else {
        clearSession();
        setUser(null);
        toast.error("Session expired.");
      }
    } catch (err) {
      console.warn("refreshMe() failed:", err);
      clearSession();
      setUser(null);
      toast.error("Session expired.");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithCredentials,
      logoutUser,
      refreshMe,
    }),
    [user, loading, loginWithCredentials, logoutUser, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for children to consume auth context
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// Gate for protected routes
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
