import React from "react";

/**
 * DashboardSkeleton
 * - Responsive 2-col grid on md+, single column on mobile
 * - Big header row + two cards
 * - Uses Tailwind's animate-pulse; neutral tokens so it matches light/dark
 */
export default function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-md bg-muted animate-pulse" aria-hidden />
        <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" aria-hidden />
      </div>

      <p className="mt-3 h-4 w-64 rounded bg-muted animate-pulse" aria-hidden />

      {/* Grid cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <div className="h-5 w-28 rounded bg-muted animate-pulse" aria-hidden />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-5/6 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-3 w-4/5 rounded bg-muted animate-pulse" aria-hidden />
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="h-5 w-24 rounded bg-muted animate-pulse" aria-hidden />
          <div className="mt-3 h-40 w-full rounded-lg bg-muted animate-pulse" aria-hidden />
        </div>
      </section>
    </div>
  );
}
