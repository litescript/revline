import React from "react";
import type { ROStatus } from "@/hooks/useROStatuses";

// Map semantic colors -> Tailwind classes (neutral/v4-friendly)
const tone: Record<string, string> = {
  blue:    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800/60",
  purple:  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800/60",
  orange:  "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800/60",
  pink:    "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-800/60",
  red:     "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800/60",
  yellow:  "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/60",
  teal:    "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800/60",
  gray:    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-200 dark:border-gray-800/60",
  indigo:  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/60",
};

export default function StatusBadge({ status }: { status: ROStatus }) {
  const cls = tone[status.color] ?? "bg-muted text-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}
      title={`${status.label} — ${status.role_owner}`}
    >
      <span className="font-medium">{status.label}</span>
    </span>
  );
}
