// frontend/src/hooks/useActiveROs.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ActiveRO, ActiveROQuery, fetchActiveROs } from "@/api/ros";
import { getRODetail, type RODetailDTO } from "@/lib/api/ros";

type UseActiveROsOpts = ActiveROQuery & {
  enabled?: boolean;
};

export function useRODetail(id: string | number) {
  return useQuery<RODetailDTO, Error>({
    queryKey: ["ro-detail", id],
    queryFn: () => getRODetail(id),
    staleTime: 15_000,
  });
}

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
