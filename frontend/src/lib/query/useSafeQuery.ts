// frontend/src/lib/query/useSafeQuery.ts

import { useEffect } from "react";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from "@tanstack/react-query";
import { isAppError, AppError } from "@/lib/query/error";
import { clearSession } from "@/lib/api/client";
import { toast } from "sonner";

/**
 * Same logic as handleGlobalError in QueryProvider,
 * duplicated here because we can't import components from QueryProvider
 * into hook land without creating a circular graph.
 */
function handleQueryError(error: unknown) {
  if (!isAppError(error)) {
    console.error("Non-AppError thrown in query:", error);
    toast.error("Unexpected error");
    return;
  }

  const appErr: AppError = error;

  if (appErr.status === 401) {
    clearSession();
    toast.error("Your session expired. Please log in again.");
    return;
  }

  if (appErr.status >= 500 || appErr.code === "network_error") {
    toast.error("Server unavailable. Retrying…");
    return;
  }

  toast.error(appErr.message || "Request failed");
}

/**
 * useSafeQuery:
 * drop-in replacement for useQuery that auto-runs handleQueryError
 * whenever the query transitions into an error state.
 *
 * - TData:     the data type you expect on success
 * - TError:    we constrain to unknown (we'll interpret as AppError at runtime)
 * - TVariables: unused here; React Query v5 uses TQueryFnData/TData/etc
 */
export function useSafeQuery<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TError = unknown
>(
  options: UseQueryOptions<TQueryFnData, TError, TData> & { queryKey: QueryKey }
): UseQueryResult<TData, TError> {
  const result = useQuery<TQueryFnData, TError, TData>(options);

  const { error } = result;

  useEffect(() => {
    if (error) {
      handleQueryError(error);
    }
  }, [error]);

  return result;
}
