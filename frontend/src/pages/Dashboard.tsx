import React from "react";
import { useUser } from "@/hooks/useUser";
import { useStats } from "@/hooks/useStats";

export default function Dashboard() {
  // current authenticated user (from AuthProvider, via useUser wrapper)
  const { user, loading: userLoading } = useUser();

  // shop stats (customers, vehicles, open_ros, etc.)
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsRefreshing,
    refetch: refetchStats,
  } = useStats();

  // initial skeleton condition:
  const showSkeleton = (userLoading && !user) || (statsLoading && !stats);

  if (showSkeleton) {
    return (
      <section className="p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="animate-spin border-2 border-transparent border-t-slate-400 rounded-full h-4 w-4" />
          <span>Loading dashboard…</span>
        </div>
      </section>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl p-6"
      aria-busy={statsRefreshing ? "true" : "false"}
    >
      {/* Header row: greeting + manual refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">
          Welcome{user ? `, ${user.name}` : ""}!
        </h1>

        <button
          onClick={() => refetchStats()}
          className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700/40 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={statsRefreshing}
        >
          {statsRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        You’re authenticated — this page is protected by{" "}
        <code className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
          RequireAuth
        </code>
        .
      </p>

      {/* Stats cards */}
      <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Customers"
          value={safeNum(stats?.customers)}
        />
        <StatCard
          label="Vehicles"
          value={safeNum(stats?.vehicles)}
        />
        <StatCard
          label="Open ROs"
          value={safeNum(stats?.open_ros)}
        />
        {/* placeholder fourth tile for layout symmetry */}
        <StatCard
          label="Status"
          value={statsRefreshing ? "Refreshing…" : "Live"}
        />
      </section>

      {/* Extra panels / roadmap */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
          <h2 className="mb-1 font-medium text-slate-100">Next steps</h2>
          <ul className="list-inside list-disc text-sm text-slate-500">
            <li>Retrofit Active RO board (done / doing in Sprint 5B)</li>
            <li>Unify all data hooks on useSafeQuery</li>
            <li>Remove all legacy apiFetch usage</li>
            <li>Enforce AppError everywhere</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
          <h2 className="mb-1 font-medium text-slate-100">
            Session snapshot
          </h2>

          {user ? (
            <pre className="mt-2 overflow-auto rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 text-[11px] leading-tight text-slate-300">
              {JSON.stringify(
                {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                },
                null,
                2
              )}
            </pre>
          ) : (
            <div className="mt-2 animate-pulse text-sm text-slate-500">
              (no active user)
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-100 tabular-nums">
        {value}
      </div>
    </div>
  );
}

// keep this super defensive so we never render "undefined"
function safeNum(n: unknown): string {
  if (typeof n === "number") return n.toString();
  if (typeof n === "string") return n;
  return "—";
}
