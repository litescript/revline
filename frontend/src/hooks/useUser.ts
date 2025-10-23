import http from "@/lib/api/client";
// frontend/src/hooks/useUser.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated, logout } from "@/lib/auth";
import {  loadTokenFromStorage } from "@/lib/api/client";

export function useUser() {
  loadTokenFromStorage(); // make memory copy ready for /auth/me
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["/auth/me"],
    enabled: isAuthenticated(),
    queryFn: async () => {
      const res = await http("/auth/me");
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  async function signOut() {
    await logout();
    qc.clear();
  }

  return { ...q, signOut };
}
