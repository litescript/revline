// frontend/src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import http from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthProvider";

type Form = { name: string; email: string; password: string };

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await http("/auth/register", {
        method: "POST",
        body: form, // object allowed; http() will JSON-stringify
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Register failed (${res.status})`);
      }
      toast.success("Account created");
      await login(form.email, form.password, { silent: true });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
          />
        </div>

        <button disabled={loading} className="w-full rounded border px-3 py-2">
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-sm">
          Already have an account? <Link className="underline" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
