import { Link, useParams } from "react-router-dom";
import { useRODetail } from "@/hooks/useActiveROs";

function currency(n: number | null | undefined) {
  if (n == null) return "-";
  return `$${n.toFixed(2)}`;
}

export default function ActiveRODetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useRODetail(id!);

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!data) return <div className="p-6">No data.</div>;

  const labor = data.lines.filter(l => (l.line_type || "").toLowerCase() === "labor");
  const parts = data.lines.filter(l => (l.line_type || "").toLowerCase() === "part");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">RO #{data.ro_number}</h1>
          <p className="text-sm text-gray-500">
            Opened {new Date(data.opened_at).toLocaleString()} • Updated {new Date(data.updated_at).toLocaleString()}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-gray-100">
          {data.status_label}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <h2 className="font-medium mb-2">Customer</h2>
          <div className="text-sm">
            <div>{data.customer_name}</div>
            {data.customer_phone && <div className="text-gray-600">{data.customer_phone}</div>}
            {data.customer_email && <div className="text-gray-600">{data.customer_email}</div>}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <h2 className="font-medium mb-2">Vehicle</h2>
          <div className="text-sm">
            <div>{data.vehicle_label}</div>
            <div className="text-gray-600">
              {data.vin && <>VIN: {data.vin} • </>}
              {data.year} {data.make} {data.model}
              {data.license_plate && <> • {data.license_plate}</>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border">
          <div className="p-4 border-b font-medium">Labor</div>
          <ul className="divide-y">
            {labor.length ? labor.map(l => (
              <li key={l.id} className="p-4">
                <div className="font-medium">{l.description}</div>
                <div className="text-sm text-gray-600">
                  {l.qty ?? "-"} @ {currency(l.unit_price)} → {currency(l.line_total)}
                </div>
              </li>
            )) : <li className="p-4 text-sm text-gray-500">No labor lines.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border">
          <div className="p-4 border-b font-medium">Parts</div>
          <ul className="divide-y">
            {parts.length ? parts.map(l => (
              <li key={l.id} className="p-4">
                <div className="font-medium">{l.description}</div>
                <div className="text-sm text-gray-600">
                  {l.qty ?? "-"} @ {currency(l.unit_price)} → {currency(l.line_total)}
                </div>
              </li>
            )) : <li className="p-4 text-sm text-gray-500">No parts lines.</li>}
          </ul>
        </div>
      </div>

      <div className="pt-2">
        <Link to="/ros/active" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
          ← Back to Active ROs
        </Link>
      </div>
    </div>
  );
}
