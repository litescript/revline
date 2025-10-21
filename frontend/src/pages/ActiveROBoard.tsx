// frontend/src/pages/ActiveROBoard.tsx
import { useMemo, useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { useActiveROs } from "@/hooks/useActiveROs";
import type { OwnerFilter } from "@/api/ros";
import { Toaster, toast } from "sonner";
import { useNavigate } from "react-router-dom";

function fmtDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}

const OWNER_OPTIONS: (OwnerFilter | "all")[] = ["all", "advisor", "technician", "parts", "foreman"];
const LS_KEY = "active-ro-filters-v1";

// Tailwind can't see `bg-${color}-100`, so map to explicit classes.
const STATUS_COLOR_MAP: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

export default function ActiveROBoard() {
  const navigate = useNavigate();

  // ---------- filters (with localStorage hydrate/persist) ----------
  const [owner, setOwner] = useState<OwnerFilter | null>(null);
  const [waiter, setWaiter] = useState<boolean | null>(null);
  const [searchRaw, setSearchRaw] = useState("");

  // hydrate once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY) || "{}";
      const saved: { owner?: any; waiter?: any; search?: string } = JSON.parse(raw);
      if (saved.owner !== undefined) setOwner(saved.owner);
      if (saved.waiter !== undefined) setWaiter(saved.waiter);
      if (saved.search !== undefined) setSearchRaw(saved.search);
    } catch {
      // ignore parse errors
    }
  }, []);


  // persist on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ owner, waiter, search: searchRaw }));
  }, [owner, waiter, searchRaw]);

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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Waiting
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> In Progress
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> QC
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500" /> Parts
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-500" /> Other
        </span>
      </div>

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
                <tr
                  key={r.id}
                  onClick={() => navigate(`/ros/${r.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/ros/${r.id}`); }}
                  role="button"
                  tabIndex={0}
                  className="[&>td]:py-2 [&>td]:px-2 border-b hover:bg-gray-50 cursor-pointer"
                >
                  <td className="font-medium">{r.ro_number}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.vehicle_label}</td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium normal-case ${
                        STATUS_COLOR_MAP[r.status.color] ?? STATUS_COLOR_MAP.gray
                      }`}
                      title={r.status.role_owner}
                    >
                      {r.status.label ?? "Unknown"}
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

          {!rows.length && (
            <div className="p-6 text-center text-muted-foreground">
              No Active ROs match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
