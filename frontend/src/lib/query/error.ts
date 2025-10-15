// src/lib/query/error.ts
import type { FetchError } from "openapi-fetch";
import { toast } from "sonner";

export type NormalizedError = {
  status?: number;
  code?: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER_ERROR" | "NETWORK_ERROR";
  message: string;
  details?: unknown;
  cause?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFetchErrorLike(e: unknown): e is Pick<FetchError, "status" | "error"> {
  return isObject(e) && "status" in e && "error" in e;
}

export function normalizeError(err: unknown): NormalizedError {
  // openapi-fetch (FetchError)
  if (isFetchErrorLike(err)) {
    const fe = err as FetchError; // narrow for intellisense; fields are checked above
    const status = fe.status;
    const code =
      status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : status === 404
        ? "NOT_FOUND"
        : status && status >= 500
        ? "SERVER_ERROR"
        : undefined;

    const message =
      (typeof fe.error === "string" && fe.error) ||
      (isObject(fe.error) && typeof (fe.error as any).detail === "string" && (fe.error as any).detail) ||
      `Request failed (${status ?? "unknown"})`;

    return { status, code, message, details: fe.error, cause: err };
  }

  // Generic network error (failed fetch, DNS, CORS, etc.)
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: "Network error — check connection or server availability.",
      details: { fetch: true },
      cause: err,
    };
  }

  // Fallback
  const message =
    (isObject(err) && typeof (err as any).message === "string" && (err as any).message) ||
    (typeof err === "string" ? err : "Something went wrong");
  return { message, cause: err };
}

/**
 * Global React Query error handler (safe for queries & mutations).
 * Wire this in QueryClient defaultOptions to avoid per-hook onError typing issues.
 */
export function onQueryError(err: unknown): void {
  const n = normalizeError(err);
  toast.error(n.message);
  // Optional: surface details to console for debugging in dev/CI logs
  // eslint-disable-next-line no-console
  console.error("[QueryError]", n);
}
