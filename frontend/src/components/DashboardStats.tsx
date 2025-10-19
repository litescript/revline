import React from "react";
import { useStats } from "@/hooks/useStats";

function StatCard({
  title,
  value,
  isLoading,
}: { title: string; value: number | string; isLoading?: boolean }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      {isLoading ? (
        <div className="mt-2 h-8 w-20 rounded-md bg-muted animate-pulse" aria-hidden />
      ) : (
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      )}
    </div>
  );
}

export default function DashboardStats() {
  const { data, isLoading, isError } = useStats();

  if (isError) {
    return (
      <section className="mt-6">
        <div className="rounded-2xl border p-4 text-sm text-red-600">
          Could not load stats.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <StatCard title="Customers" value={data?.customers ?? 0} isLoading={isLoading} />
      <StatCard title="Vehicles" value={data?.vehicles ?? 0} isLoading={isLoading} />
      <StatCard title="Open ROs" value={data?.open_ros ?? 0} isLoading={isLoading} />
    </section>
  );
}
