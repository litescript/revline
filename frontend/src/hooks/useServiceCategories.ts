import { useQuery } from "@tanstack/react-query";
import http from "@/lib/api/client";

export type ServiceCategory = {
  code: string;
  label: string;
};

export function useServiceCategories() {
  return useQuery<ServiceCategory[]>({
    queryKey: ["/meta/service-categories"],
    queryFn: async () => {
      const res = await http("/meta/service-categories");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt || res.statusText}`);
      }
      return res.json();
    },
    staleTime: 60_000,
  });
}
