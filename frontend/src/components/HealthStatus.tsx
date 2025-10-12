import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

type HealthResponse =
  | { ok: boolean; uptime?: number; version?: string }
  | { status: string; uptime?: number; version?: string };

async function fetchHealth(): Promise<{ statusText: string; uptime?: number; version?: string }> {
  // Try common health endpoints in order
  const paths = ["/api/health", "/health", "/api/v1/health"];
  let lastErr: unknown = null;

  for (const path of paths) {
    try {
      const { data } = await api.get<HealthResponse>(path);
      // Normalize: support { ok: true } or { status: "ok" }
      if ("ok" in data) {
        return { statusText: data.ok ? "ok" : "down", uptime: (data as any).uptime, version: (data as any).version };
      }
      if ("status" in data) {
        return { statusText: (data as any).status ?? "unknown", uptime: (data as any).uptime, version: (data as any).version };
      }
      // Unknown shape; stringify best-effort
      return { statusText: JSON.stringify(data) };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Health endpoint not reachable");
}

export default function HealthStatus() {
  const { data, isLoading, isError, refetch, isFetching, error } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth
  });

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backend Health</h2>
        <button
          onClick={() => refetch()}
          className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mt-3">
        {isLoading && <p>Loading…</p>}
        {isError && (
          <p className="text-red-600">
            Couldn’t reach a health endpoint (/health, /api/health, /api/v1/health).
            {error instanceof Error && <span className="block mt-1 text-sm opacity-80">Reason: {error.message}</span>}
          </p>
        )}
        {data && (
          <div className="space-y-1">
            <p><span className="font-medium">Status:</span> {data.statusText}</p>
            {data.version && <p><span className="font-medium">Version:</span> {data.version}</p>}
            {typeof data.uptime === "number" && (
              <p><span className="font-medium">Uptime:</span> {Math.round(data.uptime)}s</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
