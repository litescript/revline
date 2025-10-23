// frontend/src/pages/RODetail.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import http from "@/lib/api/client";

type RepairOrder = {
  id: number;
  customer_name?: string;
  vehicle?: string;
  status?: string;
  is_waiter?: boolean;
  updated_at?: string;
  // add other fields as your API returns them
};

export default function RODetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = React.useState<RepairOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // fetch-compatible http(): returns Response
        const res = await http(`/repair_orders/${id}`);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Fetch failed: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as RepairOrder;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load repair order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="p-4">Loading RO #{id}…</div>;
  if (error) return (
    <div className="p-4 text-red-600">
      Failed to load RO #{id}: {error} — <Link className="underline" to="/">Back</Link>
    </div>
  );
  if (!data) return <div className="p-4">No data — <Link className="underline" to="/">Back</Link></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm opacity-70"><Link className="underline" to="/">← Back to Board</Link></div>
      <h1 className="text-2xl font-semibold">RO #{data.id}</h1>
      <div className="grid gap-2">
        <div><span className="font-medium">Customer:</span> {data.customer_name ?? "—"}</div>
        <div><span className="font-medium">Vehicle:</span> {data.vehicle ?? "—"}</div>
        <div><span className="font-medium">Status:</span> {data.status ?? "—"}</div>
        <div><span className="font-medium">Waiter:</span> {data.is_waiter ? "Yes" : "No"}</div>
        <div><span className="font-medium">Updated:</span> {data.updated_at ?? "—"}</div>
      </div>
    </div>
  );
}
