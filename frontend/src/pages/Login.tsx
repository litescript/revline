import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { toast } from "sonner";

export default function Login() {
  const { user, loading, loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string } };
  };

  const [email, setEmail] = useState("demo@revline.dev");
  const [password, setPassword] = useState("your.password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already authenticated (e.g. page refresh), don't stay on /login
  useEffect(() => {
    if (!loading && user) {
      const to = location.state?.from?.pathname ?? "/dashboard";
      navigate(to, { replace: true });
    }
  }, [user, loading, location.state, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setBusy(true);

    try {
      await loginWithCredentials(email, password);
      const to = location.state?.from?.pathname ?? "/dashboard";
      navigate(to, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-white p-6">
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-4 text-sm text-gray-600">
        Use <code>demo@revline.dev</code> / <code>your.password</code>.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p
            className="mt-2 text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="mt-2 w-full rounded-md border px-3 py-2 hover:bg-gray-100 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-sm mt-2">
          New here?{" "}
          <a className="underline" href="/register">
            Create an account
          </a>
        </p>
      </form>
    </div>
  );
}
