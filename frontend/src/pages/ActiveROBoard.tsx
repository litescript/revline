// frontend/src/pages/ActiveROBoard.tsx
import React from "react";
import { fetchActiveROs, ActiveRO, fetchROById, RODetail } from "@/api/ros";
import type { ROStatus } from "@/hooks/useROStatuses";
import StatusBadge from "@/components/StatusBadge";

export default function ActiveROBoard() {
  const [rows, setRows] = React.useState<ActiveRO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [openId, setOpenId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<Record<number, RODetail | null>>({});
  const [detailLoading, setDetailLoading] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchActiveROs({});
        if (!cancelled) setRows(data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load board");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRow = (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!detail[id]) {
      setDetailLoading((s) => ({ ...s, [id]: true }));
      fetchROById(id)
        .then((d) => setDetail((s) => ({ ...s, [id]: d })))
        .catch(() => setDetail((s) => ({ ...s, [id]: null }))) // remove unused var 'e'
        .finally(() => setDetailLoading((s) => ({ ...s, [id]: false })));
    }
  };

  if (loading) return <div className="p-4">Loading active ROs…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Active Repair Orders</h1>
      <div className="divide-y border rounded">
        {rows.map((r) => {
          const isOpen = openId === r.id;
          const d = detail[r.id];
          const dLoading = detailLoading[r.id];

          // Build a proper ROStatus object regardless of backend shape
          const statusObj: ROStatus =
            typeof r.status === "object"
              ? r.status
              : { status_code: r.status, label: r.status, role_owner: "advisor", color: "gray" };


          return (
            <div key={r.id}>
              <button
                onClick={() => toggleRow(r.id)}
                className="w-full text-left px-3 py-2 hover:bg-muted/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">RO {r.ro_number}</span>
                  <span className="opacity-70">{r.customer_name}</span>
                  <span className="opacity-70">{r.vehicle_label}</span>
                  <StatusBadge status={statusObj} />
                  {r.is_waiter && (
                    <span className="text-xs px-2 py-0.5 border rounded">Waiter</span>
                  )}
                </div>
                <div className="text-sm opacity-60">
                  {new Date(r.updated_at).toLocaleString()}
                </div>
              </button>

              {isOpen && (
                <div className="bg-muted/20 px-4 py-3">
                  {dLoading && <div className="text-sm">Loading details…</div>}
                  {!dLoading && !d && (
                    <div className="text-sm text-red-600">
                      Failed to load details.
                    </div>
                  )}
                  {!dLoading && d && (
                    <div className="grid gap-2 text-sm">
                      <div>
                        <span className="font-medium">Customer:</span>{" "}
                        {d.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Vehicle:</span>{" "}
                        {d.vehicle_label ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>{" "}
                        {typeof d.status === "string"
                          ? d.status
                          : d.status?.label ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Waiter:</span>{" "}
                        {d.is_waiter ? "Yes" : "No"}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span>{" "}
                        {d.updated_at ?? "—"}
                      </div>
                      {d.notes && (
                        <div>
                          <span className="font-medium">Notes:</span> {d.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
