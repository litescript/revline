// frontend/src/components/StatusBadge.tsx
import React from "react";
import type { ROStatus } from "@/hooks/useROStatuses";

export default function StatusBadge({ status }: { status: ROStatus }) {
  if (!status) return null;

  // fallbacks
  const color = status.color || "gray";
  const label = status.label || status.status_code || "—";

  // Map your known palette to soft bg + strong text
  const colorMap: Record<string, string> = {
    gray: "bg-gray-200 text-gray-800",
    blue: "bg-blue-200 text-blue-900",
    green: "bg-green-200 text-green-900",
    yellow: "bg-yellow-200 text-yellow-900",
    red: "bg-red-200 text-red-900",
    purple: "bg-purple-200 text-purple-900",
    orange: "bg-orange-200 text-orange-900",
    indigo: "bg-indigo-200 text-indigo-900",
  };

  const cls =
    colorMap[color] ??
    "bg-gray-200 text-gray-900"; // fallback for any unexpected colors

  return (
    <span
      className={`inline-block px-2 py-[1px] rounded-full text-xs font-medium whitespace-nowrap ${cls}`}
      title={label}
    >
      {label}
    </span>
  );
}
