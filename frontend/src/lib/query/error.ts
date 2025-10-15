import { toast } from "sonner";

export type NormalizedError = {
  status?: number;
  code?: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER_ERROR" | "NETWORK_ERROR";
  message: string;
  details?: unknown;
  cause?: unknown;
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isFetchErrorLike(e: unknown): e is { status?: number; error?: unknown } {
  return isObj(e) && "status" in e && "error" in e;
}

export function normalizeError(err: unknown): NormalizedError {
  if (isFetchErrorLike(err)) {
    const status = typeof normalizeError(err).status === "number" ? normalizeError(err).status : undefined;
    const code =
      status === 401 ? "UNAUTHORIZED" :
      status === 403 ? "FORBIDDEN" :
      status === 404 ? "NOT_FOUND" :
      status && status >= 500 ? "SERVER_ERROR" : undefined;

    const details = (err as any).error;
    const detailMsg =
      (typeof details === "string" && details) ||
      (isObj(details) && typeof (details as any).detail === "string" && (details as any).detail) ||
      undefined;

    return {
      status,
      code,
      message: detailMsg ?? `Request failed${status ? ` (${status})` : ""}`,
      details,
      cause: err,
    };
  }

  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: "Network error — check connection or server availability.",
      details: { fetch: true },
      cause: err,
    };
  }

  const message =
    (isObj(err) && typeof (err as any).message === "string" && (err as any).message) ||
    (typeof err === "string" ? err : "Something went wrong");
  return { message, cause: err };
}

export function onQueryError(err: unknown): void {
  const n = normalizeError(err);
  toast.error(n.message);
  // eslint-disable-next-line no-console
  console.error("[QueryError]", n);
}
