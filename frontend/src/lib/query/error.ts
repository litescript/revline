// src/lib/query/error.ts
import type { FetchError } from "openapi-fetch";

export type NormalizedError = {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  cause?: unknown;
};

export function normalizeError(err: unknown): NormalizedError {
  const anyErr = err as any;

  // openapi-fetch (FetchError)
  if (anyErr && typeof anyErr === "object" && "error" in anyErr && "status" in anyErr) {
    const fe = anyErr as FetchError;
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

    let message =
      (typeof fe.error === "string" && fe.error) ||
      (fe.error?.detail as string) ||
      `Request failed (${status})`;

    return { status, code, message, details: fe.error, cause: err };
  }

  // Generic network error
  if (anyErr instanceof TypeError && anyErr.message.includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: "Network error — check connection or server availability.",
      details: { fetch: true },
      cause: err,
    };
  }

  // Fallback
  const message =
    (anyErr?.message as string) ??
    (typeof err === "string" ? err : "Something went wrong");
  return { message, cause: err };
}
