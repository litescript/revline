// frontend/src/lib/query/error.ts

/**
 * AppError is the ONLY error shape UI code should ever have to deal with.
 * Anything thrown from our API client, TanStack Query fetchers, auth helpers,
 * etc. should ultimately be normalized into this.
 */
export interface AppError {
  status: number;        // HTTP code, or 0 if we never got a response at all
  code: string;          // machine-oriented code ("unauthorized", "network_error", etc.)
  message: string;       // safe, human-readable summary for UI
  retryable: boolean;    // hint for Query retry logic / buttons like "Retry"
}

/**
 * Convert a low-level network failure (fetch threw before giving us Response)
 * into a stable AppError.
 *
 * Examples:
 * - API container down
 * - DNS failure
 * - CORS/network block
 * - user lost Wi-Fi
 */
export function networkErrorToAppError(err: unknown): AppError {
  return {
    status: 0,
    code: "network_error",
    message:
      err instanceof Error
        ? err.message || "Network error"
        : "Network error",
    retryable: true
  };
}

/**
 * Convert a non-OK Response into an AppError.
 *
 * We try to parse backend JSON `{ code, message }`. If that doesn't work
 * (HTML error page, empty body, etc.), we fall back to a generic message.
 *
 * retryable:
 * - 5xx is usually retryable
 * - 4xx defaults to not retryable unless it's something transient we decide later
 */
export async function responseToAppError(res: Response): Promise<AppError> {
  let code = "http_error";
  let message = `Request failed with status ${res.status}`;
  let retryable = res.status >= 500;

  try {
    const data = await res.json();
    if (data && typeof data === "object") {
      if (typeof (data as any).code === "string") {
        code = (data as any).code;
      }
      if (typeof (data as any).message === "string") {
        message = (data as any).message;
      }
    }
  } catch {
    // ignore JSON parse failure, keep fallback message
  }

  return {
    status: res.status,
    code,
    message,
    retryable
  };
}

/**
 * Helper so we can safely branch on error types in shared handlers / UI.
 */
export function isAppError(e: unknown): e is AppError {
  if (!e || typeof e !== "object") return false;
  const maybe = e as Partial<AppError>;
  return (
    typeof maybe.status === "number" &&
    typeof maybe.code === "string" &&
    typeof maybe.message === "string" &&
    typeof maybe.retryable === "boolean"
  );
}
