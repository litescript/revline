// frontend/src/hooks/useActiveROs.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ActiveRO, ActiveROQuery, fetchActiveROs } from "@/api/ros";

type UseActiveROsOpts = ActiveROQuery & {
  enabled?: boolean;
};

export function useActiveROs(opts: UseActiveROsOpts) {
  const { owner = null, waiter = null, search = null, enabled = true } = opts;

  return useQuery<ActiveRO[]>({
    queryKey: ["active-ros", { owner, waiter, search }],
    queryFn: () => fetchActiveROs({ owner, waiter, search }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,   // 15s auto-refetch
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });
}
