// frontend/src/pages/ActiveROBoard.tsx
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useActiveROs } from "@/hooks/useActiveROs";
import type { OwnerFilter } from "@/api/ros";
import { Toaster, toast } from "sonner";

function fmtDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}

const OWNER_OPTIONS: (OwnerFilter | "all")[] = ["all", "advisor", "technician", "parts", "foreman"];

export default function ActiveROBoard() {
  const [owner, setOwner] = useState<OwnerFilter | null>(null);
  const [waiter, setWaiter] = useState<boolean | null>(null);
  const [searchRaw, setSearchRaw] = useState("");
  const [search] = useDebounce(searchRaw, 250);

  const qOwner = owner ?? null;
  const qWaiter = waiter;
  const qSearch = search ? search : null;

  const { data, isLoading, isFetching, refetch, error } = useActiveROs({
    owner: qOwner,
    waiter: qWaiter,
    search: qSearch,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const onRefresh = async () => {
    const id = "ros-refresh";
    await refetch();
    toast.dismiss(id);
    toast.success("Active ROs refreshed", { id });
  };

  return (
    <div className="p-6 space-y-4">
      <Toaster richColors />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Owner</label>
            <select
              className="border rounded-xl px-3 py-2"
              value={owner ?? "all"}
              onChange={(e) => {
                const v = e.target.value as OwnerFilter | "all";
                setOwner(v === "all" ? null : v);
              }}
            >
              {OWNER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              id="waiter"
              type="checkbox"
              className="size-4"
              checked={waiter === true}
              onChange={(e) => setWaiter(e.target.checked ? true : null)}
            />
            <label htmlFor="waiter" className="text-sm font-medium">
              Waiter only
            </label>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Search</label>
            <input
              className="border rounded-xl px-3 py-2 w-64"
              placeholder="RO #, customer, vehicle..."
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl px-4 py-2 border shadow-sm hover:shadow transition"
            onClick={onRefresh}
            disabled={isFetching}
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-red-600">Failed to load: {(error as any)?.message ?? "Unknown error"}</div>
      ) : isLoading && !rows.length ? (
        <div className="text-muted-foreground">Loading Active ROs…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="[&>th]:text-left [&>th]:py-2 [&>th]:px-2 border-b">
                <th>RO #</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Waiter</th>
                <th>Opened</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="[&>td]:py-2 [&>td]:px-2 border-b hover:bg-gray-50">
                  <td className="font-medium">{r.ro_number}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.vehicle_label}</td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${r.status.color}-100 text-${r.status.color}-800`}
                      title={r.status.role_owner}
                    >
                      {r.status.label}
                    </span>
                  </td>
                  <td>
                    {r.is_waiter ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                        Waiter
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>{fmtDate(r.opened_at)}</td>
                  <td>{fmtDate(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!rows.length && <div className="p-6 text-center text-muted-foreground">No Active ROs match your filters.</div>}
        </div>
      )}
    </div>
  );
}
