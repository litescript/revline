import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export type StatsResponse = {
  customers: number;
  vehicles: number;
  open_ros: number;
};

export function useStats() {
  return useQuery<StatsResponse>({
    queryKey: ["/stats"],
    queryFn: async () => {
      const res = await apiFetch("/stats");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt || res.statusText}`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}
