// (4) TanStack Query hooks for auth (JWT stored client-side)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login, me, type LoginInput } from "./api";

export const authKeys = {
  me: () => ["auth", "me"] as const,
};

export function useMe(token: string | null) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => me(token!),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginInput) => login(body),
    onSuccess: (data) => {
      localStorage.setItem("revline_token", data.access_token);
      qc.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem("revline_token");
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: authKeys.me(), exact: true });
    },
  });
}
