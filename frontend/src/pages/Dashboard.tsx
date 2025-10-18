import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export default function Dashboard() {
  const { data: user, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/auth/me"],
    queryFn: async () => {
      const res = await apiFetch("/auth/me");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt || res.statusText}`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Welcome{user ? `, ${user.name}` : ""}!
        </h1>
        <button onClick={() => refetch()} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        You’re authenticated — this page is protected by <code>RequireAuth</code>.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <h2 className="mb-1 font-medium">Next steps</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>Add registration UI</li>
            <li>Wire toast + loading skeletons</li>
            <li>Hook real backend data</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-4">
          <h2 className="mb-1 font-medium">Auth state</h2>
          {isLoading && <div className="mt-2 animate-pulse text-sm text-muted-foreground">Loading user…</div>}
          {isError && <div className="mt-2 text-sm text-red-600">Could not load user. {(error as Error)?.message}</div>}
          {user && (
            <pre className="mt-2 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
{JSON.stringify(user, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
