// frontend/src/components/ROInlineDetail.tsx
import React from "react";
import type { RODetail } from "@/api/ros";

type Props = {
  detail: RODetail | null;
  loading: boolean;
  error?: string | null;
};

export default function ROInlineDetail({ detail, loading, error }: Props) {
  if (loading) {
    return (
      <div className="p-4 bg-white ring-1 ring-gray-200 rounded-b-xl">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-44 bg-gray-200 rounded" />
          <div className="h-3 w-72 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 ring-1 ring-red-200 rounded-b-xl">
        {error}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 bg-white ring-1 ring-gray-200 rounded-b-xl">
        <p className="text-sm text-gray-500">No details available.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white ring-1 ring-gray-200 rounded-b-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Advisor</div>
          <div className="font-medium">{detail.advisor_name ?? "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Technician</div>
          <div className="font-medium">{detail.technician_name ?? "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Updated</div>
          <div className="font-medium">
            {new Date(detail.updated_at).toLocaleString()}
          </div>
        </div>
      </div>

      {detail.notes && (
        <div className="mt-4">
          <div className="text-gray-500 text-sm mb-1">Notes</div>
          <div className="text-sm">{detail.notes}</div>
        </div>
      )}

      {detail.line_items && detail.line_items.length > 0 && (
        <div className="mt-4">
          <div className="text-gray-500 text-sm mb-2">Line Items</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Hours</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.line_items.map((li) => (
                  <tr key={li.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 whitespace-nowrap">{li.code}</td>
                    <td className="py-2 pr-4">{li.description}</td>
                    <td className="py-2 pr-4">{li.qty}</td>
                    <td className="py-2 pr-4">{li.hours ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {li.price != null ? `$${li.price.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 pr-4">{li.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
