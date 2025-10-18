import { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as [string, ...unknown[]];
        const res = await apiFetch(path);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        return res.json();
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don’t spin forever on 401/403/etc.
        if (error?.message?.includes("401")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
