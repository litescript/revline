import { apiFetch, saveToken, clearSession, loadTokenFromStorage } from "@/lib/api/client";

export async function login(email: string, password: string) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  saveToken(data.access_token, data.expires_in);
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" });
  clearSession();
}

export function isAuthenticated(): boolean {
  loadTokenFromStorage();
  try {
    const raw = localStorage.getItem("revline_token");
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { accessToken: string; expiresAt: number };
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}
