import { useSafeQuery } from "@/lib/query/useSafeQuery";
import { api } from "@/lib/api/client";

export type ROStatus = {
  status_code: string;
  label: string;
  role_owner: "technician" | "advisor" | "parts" | "foreman" | string;
  color: string; // e.g. "blue", "purple", etc.
};

// local fetcher with runtime validation-lite
async function fetchROStatuses(): Promise<ROStatus[]> {
  // In 5B, api.get() should:
  // - include auth/session automatically
  // - throw AppError on non-2xx
  // - return parsed JSON body
  const data = await api.get("/meta/ro-statuses");

  if (!Array.isArray(data)) {
    throw new Error("Invalid /meta/ro-statuses payload (not an array)");
  }

  // sanity check first element shape so junk can't silently poison UI
  for (const item of data) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as any).status_code !== "string" ||
      typeof (item as any).label !== "string"
    ) {
      throw new Error("Invalid /meta/ro-statuses payload (bad item shape)");
    }
  }

  return data as ROStatus[];
}

export function useROStatuses() {
  return useSafeQuery<ROStatus[]>({
    // convention for keys in hardened layer:
    // stable string + optional param bag
    queryKey: ["ro-statuses"],
    queryFn: fetchROStatuses,
    staleTime: 60_000,
  });
}
