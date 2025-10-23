import { useQuery } from "@tanstack/react-query";
import http from "@/lib/api/client";

export type ROStatus = {
  status_code: string;
  label: string;
  role_owner: "technician" | "advisor" | "parts" | "foreman" | string;
  color: string; // e.g., "blue", "purple", etc.
};

export function useROStatuses() {
  return useQuery<ROStatus[]>({
    queryKey: ["/meta/ro-statuses"],
    queryFn: async () => {
      const res = await http("/meta/ro-statuses");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt || res.statusText}`);
      }
      return res.json();
    },
    staleTime: 60_000,
  });
}
