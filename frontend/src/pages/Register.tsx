import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, saveToken } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider"

type Form = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Form | "general", string>>;

export default function RegisterPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<Form>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 8) e.password = "Minimum 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        let msg = "Registration failed";
        try {
          const j = await res.json();
          if (j?.detail) msg = String(j.detail);
          else if (j?.message) msg = String(j.message);
        } catch {
          const t = await res.text().catch(() => "");
          if (t) msg = t;
        }
        setErrors({ general: msg });
        return;
      }

      // ✅ Use AuthProvider’s login to set user and navigate
      await login(form.email, form.password);
      // login() already navigates to /dashboard and toasts “Signed in!”

      toast.success("Account created. Signing you in…");

      const loginRes = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!loginRes.ok) {
        toast.info("Please sign in.");
        nav("/login");
        return;
      }
      const data = await loginRes.json();
      if (data?.access_token && typeof data.expires_in === "number") {
        saveToken(data.access_token, data.expires_in);
      }
      nav("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl p-6 border">
        <h1 className="text-2xl font-semibold">Create your account</h1>

        {errors.general && <p className="text-red-600 text-sm">{errors.general}</p>}

        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className="w-full rounded-xl border p-2"
            placeholder="Jane Doe"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className="w-full rounded-xl border p-2"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            className="w-full rounded-xl border p-2"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
        </div>

        <button
          disabled={loading}
          className="w-full rounded-2xl p-2 bg-black text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-sm">
          Already have an account? <Link className="underline" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
