import { useSafeQuery } from "@/lib/query/useSafeQuery";
import { api } from "@/lib/api/client";

export type ServiceCategory = {
  code: string;
  label: string;
};

async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  // hardened client: throws AppError automatically on !ok
  const data = await api.get("/meta/service-categories");

  if (!Array.isArray(data)) {
    throw new Error(
      "Invalid /meta/service-categories payload (not an array)"
    );
  }

  for (const item of data) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as any).code !== "string" ||
      typeof (item as any).label !== "string"
    ) {
      throw new Error(
        "Invalid /meta/service-categories payload (bad item shape)"
      );
    }
  }

  return data as ServiceCategory[];
}

export function useServiceCategories() {
  return useSafeQuery<ServiceCategory[]>({
    // stable, human name — not the URL path
    queryKey: ["service-categories"],
    queryFn: fetchServiceCategories,
    staleTime: 60_000, // 1 min is fine here; categories basically never change
  });
}
