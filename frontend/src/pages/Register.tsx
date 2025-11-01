import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { api } from "@/lib/api/client";

type Form = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Form | "general", string>>;

export default function RegisterPage() {
  const nav = useNavigate();
  const { loginWithCredentials } = useAuth();

  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // local client-side validation before hitting backend
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
      // Hardened client call:
      // api.post should:
      //   - JSON.stringify body for us OR accept plain object depending on your client impl
      //   - throw AppError on !ok
      //   - return parsed JSON (we don't actually need it here except for error messages)
      await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // Auto-login after successful create
      await loginWithCredentials(form.email, form.password, { silent: true });

      toast.success("Account created — you’re in.");
      nav("/dashboard", { replace: true });
    } catch (err: any) {
      // Try to surface a useful message.
      // AppError should have `message`, but we also fall back gracefully.
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        "Registration failed";

      setErrors((e) => ({ ...e, general: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>

      {errors.general && (
        <div
          className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {errors.general}
        </div>
      )}

      <form className="space-y-4" onSubmit={submit} noValidate>
        <div>
          <label className="mb-1 block text-sm">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className={`w-full rounded-2xl border px-3 py-2 outline-none focus:ring ${
              errors.name ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="Jane Doe"
            autoComplete="name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className={`w-full rounded-2xl border px-3 py-2 outline-none focus:ring ${
              errors.email ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="you@revline.dev"
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            className={`w-full rounded-2xl border px-3 py-2 outline-none focus:ring ${
              errors.password ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-black px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-sm">
          Already have an account?{" "}
          <Link className="underline" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
