import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeError } from "./error";

const isProd = import.meta.env.PROD;

// Sensible, fast defaults for an API-backed app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "online",
      // keep cache warm for quick nav; refetch happens on window focus by default (good DX)
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, err) => {
        const n = normalizeError(err);
        // Don’t spam-retry on 4xx except 408; retry 2x on network/5xx
        if (n.status && n.status >= 400 && n.status < 500 && n.status !== 408) return false;
        return failureCount < 2;
      },
      // Central toast for query errors (mutations handle their own below)
      onError: (err) => {
        const n = normalizeError(err);
        toast.error(n.message || "Request failed", {
          description: n.code || (n.status ? `HTTP ${n.status}` : undefined),
        });
      },
    },
    mutations: {
      networkMode: "online",
      retry: (failureCount, err) => {
        const n = normalizeError(err);
        if (n.status && n.status >= 400 && n.status < 500 && n.status !== 408) return false;
        return failureCount < 1; // 1 retry for writes is usually enough
      },
      onError: (err) => {
        const n = normalizeError(err);
        toast.error(n.message || "Action failed", {
          description: n.code || (n.status ? `HTTP ${n.status}` : undefined),
        });
      },
      onSuccess: (_data, _vars, _ctx) => {
        // Optionally show a success toast when you want; default is silent.
        // toast.success("Saved");
      },
    },
  },
});

// Optional global handler for unhandled rejections (helps surface errors in dev)
if (!isProd && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    // Let React Query handle known promise chains; this is a best-effort DX helper
    console.debug("[unhandledrejection]", e.reason);
  });
}
