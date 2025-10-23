// frontend/src/api/ros.ts
import http from "@/lib/api/client";

export type OwnerFilter = "advisor" | "technician" | "parts" | "foreman";

export type ROStatusMeta = {
  status_code: string;
  label: string;
  role_owner: OwnerFilter;
  color: string;
};

export type ActiveRO = {
  id: number;
  ro_number: string;
  customer_name: string;
  vehicle_label: string;
  advisor_name: string | null;
  tech_name: string | null;
  opened_at: string;
  updated_at: string;
  is_waiter: boolean;
  status: ROStatusMeta;
};

export type ActiveROQuery = {
  owner?: OwnerFilter | null;
  waiter?: boolean | null;
  search?: string | null;
};

export async function fetchActiveROs(q: ActiveROQuery): Promise<ActiveRO[]> {
  const params: Record<string, string> = {};
  if (q.owner) params.owner = q.owner;
  if (typeof q.waiter === "boolean") params.waiter = String(q.waiter);
  if (q.search) params.search = q.search;

  const qs = new URLSearchParams(params).toString();
  const res = await http(`/ros/active${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Failed to load active ROs (${res.status})`);
  }
  return res.json() as Promise<ActiveRO[]>;
}
