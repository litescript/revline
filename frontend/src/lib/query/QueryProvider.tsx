// frontend/src/lib/query/QueryProvider.tsx

import React, { PropsWithChildren, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAppError, AppError } from "@/lib/query/error";
import { clearSession } from "@/lib/api/client";

/**
 * Central handler for query/mutation failures.
 */
function handleGlobalError(error: unknown) {
  if (!isAppError(error)) {
    console.error("Non-AppError thrown in query:", error);
    toast.error("Unexpected error");
    return;
  }

  const appErr: AppError = error;

  if (appErr.status === 401) {
    clearSession();
    // TODO: route to /login if router is available here
    toast.error("Your session expired. Please log in again.");
    return;
  }

  if (appErr.status >= 500 || appErr.code === "network_error") {
    toast.error("Server unavailable. Retrying…");
    return;
  }

  toast.error(appErr.message || "Request failed");
}

export function AppQueryProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          /**
           * Retry policy:
           * - only retry if error is an AppError
           * - only retry if error.retryable === true
           * - cap retries so we don’t hammer backend
           */
          retry(failureCount, error) {
            if (!isAppError(error)) return false;
            if (!error.retryable) return false;
            return failureCount < 2;
          },

          /**
           * Don't spam refetch when tab/window regains focus.
           */
          refetchOnWindowFocus: false,

          /**
           * Default staleness window in ms.
           */
          staleTime: 5000
        },

        /**
         * Mutations still support default onError in v5,
         * so we'll keep centralized handling here.
         */
        mutations: {
          onError(error) {
            handleGlobalError(error);
          }
        }
      }
    });
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
