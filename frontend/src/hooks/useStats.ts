import { useSafeQuery } from "@/lib/query/useSafeQuery";
import { api } from "@/lib/api/client";

export type StatsResponse = {
  customers: number;
  vehicles: number;
  open_ros: number;
};

// Internal fetcher using hardened API client.
// api.get() should:
// - include auth/session automatically
// - return parsed JSON
// - throw AppError on non-2xx so we don't hand-roll error handling
async function fetchStats(): Promise<StatsResponse> {
  const data = await api.get("/stats");

  // Minimal runtime validation so we don't quietly render garbage.
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid /stats payload (not an object)");
  }

  const d = data as Partial<StatsResponse>;

  if (
    typeof d.customers !== "number" ||
    typeof d.vehicles !== "number" ||
    typeof d.open_ros !== "number"
  ) {
    throw new Error("Invalid /stats payload (bad fields)");
  }

  return data as StatsResponse;
}

export function useStats() {
  return useSafeQuery<StatsResponse>({
    // semantic key, not raw URL
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
