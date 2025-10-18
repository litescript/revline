// (26) Health page with TanStack Query + Refresh button
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

type Health = { ok: boolean };

export default function HealthPage() {
  const q = useQuery({
    queryKey: ["health"],
    queryFn: () => http<Health>("/health"),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const status =
    q.isLoading ? "checking…" : q.isError ? "unhealthy" : q.data?.ok ? "healthy" : "unhealthy";

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API Health</h1>
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-sm",
              status === "healthy" && "border-green-600 text-green-700",
              status === "unhealthy" && "border-red-600 text-red-700",
              status === "checking…" && "border-gray-400 text-gray-600",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {status}
          </span>
          <button
            onClick={() => q.refetch()}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            disabled={q.isFetching}
          >
            {q.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Checks <code>/api/v1/health</code> via the shared HTTP client.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <h2 className="mb-2 font-medium">Raw response</h2>
          <pre className="overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
{q.isError ? (q.error as Error).message : JSON.stringify(q.data, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border p-4">
          <h2 className="mb-2 font-medium">Query state</h2>
          <ul className="text-sm text-muted-foreground">
            <li>isLoading: {String(q.isLoading)}</li>
            <li>isFetching: {String(q.isFetching)}</li>
            <li>isError: {String(q.isError)}</li>
            <li>lastUpdated: {q.dataUpdatedAt ? new Date(q.dataUpdatedAt).toLocaleString() : "—"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
