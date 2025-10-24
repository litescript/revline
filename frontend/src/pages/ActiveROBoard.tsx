// frontend/src/pages/ActiveROBoard.tsx
import React from "react";
import { fetchActiveROs, ActiveRO, fetchROById, RODetail } from "@/api/ros";
import type { ROStatus } from "@/hooks/useROStatuses";
import StatusBadge from "@/components/StatusBadge";

const DEBOUNCE_MS = 250;

export default function ActiveROBoard() {
  // server data & derived rows
  const [rawRows, setRawRows] = React.useState<ActiveRO[]>([]);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [refetching, setRefetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // filters
  const [owner, setOwner] = React.useState<string>("");
  const [waiterOnly, setWaiterOnly] = React.useState<boolean>(false); // ← local-only filter (instant)
  const [search, setSearch] = React.useState<string>("");

  // details
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<Record<number, RODetail | null>>({});
  const [detailLoading, setDetailLoading] = React.useState<Record<number, boolean>>({});
  const [detailError, setDetailError] = React.useState<Record<number, string | null>>({});

  // Initial load
  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchActiveROs({ signal: controller.signal });
        if (!cancelled) setRawRows(data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load board");
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  // Refetch on server-side filters ONLY (owner/search)
  React.useEffect(() => {
    if (loadingInitial) return;
    let cancelled = false;
    const controller = new AbortController();
    setRefetching(true);
    setError(null);

    const t = setTimeout(async () => {
      try {
        const data = await fetchActiveROs({
          owner: owner || null,
          search: search || null,
          // waiterOnly is LOCAL — do not send here
          signal: controller.signal,
        });
        if (!cancelled) {
          setRawRows(data);
          // close open row if it no longer exists under new owner/search
          if (openId != null && !data.some((r) => r.id === openId)) setOpenId(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load board");
      } finally {
        if (!cancelled) setRefetching(false);
      }
    }, DEBOUNCE_MS);

    return () => { cancelled = true; controller.abort(); clearTimeout(t); };
  }, [owner, search, openId, loadingInitial]);

  // Local, instantaneous waiter-only filter
  const rows = React.useMemo(
    () => (waiterOnly ? rawRows.filter((r) => r.is_waiter) : rawRows),
    [rawRows, waiterOnly]
  );

  // If waiter-only hides the open row, close it immediately (no flash)
  React.useEffect(() => {
    if (openId != null && !rows.some((r) => r.id === openId)) setOpenId(null);
  }, [waiterOnly, rows, openId]);

  const ensureDetail = (id: number) => {
    if (detail[id] || detailLoading[id]) return;
    setDetailLoading((s) => ({ ...s, [id]: true }));
    setDetailError((s) => ({ ...s, [id]: null }));
    fetchROById(id)
      .then((d) => setDetail((s) => ({ ...s, [id]: d })))
      .catch((e: unknown) =>
        setDetailError((s) => ({ ...s, [id]: e instanceof Error ? e.message : "Failed to load detail" }))
      )
      .finally(() => setDetailLoading((s) => ({ ...s, [id]: false })));
  };

  const toggleRow = (id: number) => {
    const closing = openId === id;
    setOpenId(closing ? null : id);
    if (!closing) ensureDetail(id);
  };

  // compact row classes
  const cell = "px-3 py-1.5 leading-tight align-middle";
  const head = "px-3 py-2 text-left";

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Active Repair Orders</h1>
          {refetching && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
              Updating…
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <label htmlFor="filterOwner" className="text-sm font-medium text-gray-700">Owner</label>
            <select
              id="filterOwner"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">All</option>
              <option value="advisor">Advisor</option>
              <option value="technician">Technician</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={waiterOnly}
                onChange={(e) => setWaiterOnly(e.target.checked)} // ← instant, no network
              />
              Waiter only
            </label>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="RO #, customer, vehicle…"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full md:w-[28rem]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setSearch((s) => s)}
              className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-[13px]">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr className="border-b border-gray-200">
                  <th className={head}>RO #</th>
                  <th className={head}>Customer</th>
                  <th className={head}>Vehicle</th>
                  <th className={head}>Status</th>
                  <th className={head}>Waiter</th>
                  <th className={head}>Opened</th>
                  <th className={head}>Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loadingInitial && (
                  <tr><td colSpan={7} className="px-4 py-6 text-gray-600">Loading active ROs…</td></tr>
                )}

                {!loadingInitial && !error && rows.map((r) => {
                  const isOpen = openId === r.id;
                  const d = detail[r.id];
                  const dLoading = detailLoading[r.id];

                  const statusObj: ROStatus =
                    typeof r.status === "object"
                      ? (r.status as ROStatus)
                      : { status_code: String(r.status), label: String(r.status), role_owner: "advisor", color: "gray" };

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={`transition-colors hover:bg-gray-50 ${isOpen ? "bg-gray-50" : ""}`}
                        onMouseEnter={() => ensureDetail(r.id)}
                        onFocus={() => ensureDetail(r.id)}
                        onClick={() => toggleRow(r.id)}
                      >
                        <td className={`${cell} font-mono tabular-nums whitespace-nowrap`}>RO {r.ro_number}</td>
                        <td className={`${cell} truncate`}>{r.customer_name}</td>
                        <td className={`${cell} truncate`}>{r.vehicle_label}</td>
                        <td className={`${cell} whitespace-nowrap`}>
                          {/* NOTE: status pill color tweak can be done inside StatusBadge; we’ll do that in the polish pass */}
                          <StatusBadge status={statusObj} />
                        </td>
                        <td className={cell}>
                          {r.is_waiter ? <span className="text-xs px-2 py-0.5 border rounded">Waiter</span> : "—"}
                        </td>
                        <td className={`${cell} text-gray-600 whitespace-nowrap`}>
                          {r.opened_at ? new Date(r.opened_at).toLocaleString() : "—"}
                        </td>
                        <td className={`${cell} text-gray-600 whitespace-nowrap`}>
                          {new Date(r.updated_at).toLocaleString()}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-2 border-top border-gray-200">
                            {dLoading && <div className="text-sm text-gray-600">Loading details…</div>}
                            {!dLoading && detailError[r.id] && (
                              <div className="text-sm text-red-600">{detailError[r.id]}</div>
                            )}
                            {!dLoading && d && (
                              <div className="p-4 bg-white ring-1 ring-gray-200 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm leading-tight">
                                  <div>
                                    <div className="text-gray-500">Customer</div>
                                    <div className="font-medium">{d.customer_name}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Vehicle</div>
                                    <div className="font-medium">{d.vehicle_label ?? "—"}</div>
                                  </div>
                                  <div className="text-right md:text-right">
                                    <div className="text-gray-500">RO #</div>
                                    <div className="font-semibold">RO {d.ro_number}</div>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm leading-tight">
                                  <div>
                                    <div className="text-gray-500">Status</div>
                                    <div className="font-medium">
                                      {typeof (d as any).status === "object"
                                        ? (d as any).status?.label ?? "—"
                                        : (d as any).status ?? "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Waiter</div>
                                    <div className="font-medium">{d.is_waiter ? "Yes" : "No"}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Updated</div>
                                    <div className="font-medium">{d.updated_at ?? "—"}</div>
                                  </div>
                                </div>

                                {d.notes && (
                                  <div className="mt-3">
                                    <div className="text-gray-500 text-sm mb-1">Notes</div>
                                    <div className="text-sm leading-tight">{d.notes}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {!loadingInitial && error && (
                  <tr><td colSpan={7} className="px-4 py-4 text-red-600">{error}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
