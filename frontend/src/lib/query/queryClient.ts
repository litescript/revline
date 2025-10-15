import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeError } from "./error";

const isProd = import.meta.env.PROD;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "online",
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (failureCount: number, err: unknown) => {
        const n = normalizeError(err);
        // Don’t spam-retry on 4xx except 408; retry 2x on network/5xx
        if (n.status && n.status >= 400 && n.status < 500 && n.status !== 408) return false;
        return failureCount < 2;
      },
      onError: (err: unknown) => {
        const n = normalizeError(err);
        toast.error(n.message || "Request failed", {
          description: n.code || (n.status ? `HTTP ${n.status}` : undefined),
        });
      },
    },
    mutations: {
      networkMode: "online",
      retry: (failureCount: number, err: unknown) => {
        const n = normalizeError(err);
        if (n.status && n.status >= 400 && n.status < 500 && n.status !== 408) return false;
        return failureCount < 1; // 1 retry for writes is usually enough
      },
      onError: (err: unknown) => {
        const n = normalizeError(err);
        toast.error(n.message || "Action failed", {
          description: n.code || (n.status ? `HTTP ${n.status}` : undefined),
        });
      },
      onSuccess: (_data, _vars, _ctx) => {
        // toast.success("Saved");
      },
    },
  },
});

// Optional global handler for unhandled rejections (helps surface errors in dev)
if (!isProd && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    // Let React Query handle known promise chains; this is a best-effort DX helper
    console.debug("[unhandledrejection]", e.reason);
  });
}
