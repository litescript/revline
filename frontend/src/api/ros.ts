// frontend/src/api/ros.ts
import axios from "axios";

export type OwnerFilter = "advisor" | "technician" | "parts" | "foreman";

export type ROStatusMeta = {
  status_code: string;
  label: string;
  role_owner: OwnerFilter;
  color: string; // tailwind color name (e.g., "blue", "purple")
};

export type ActiveRO = {
  id: number;
  ro_number: string;
  customer_name: string;
  vehicle_label: string;
  advisor_name: string | null;
  tech_name: string | null;
  opened_at: string;  // ISO
  updated_at: string; // ISO
  is_waiter: boolean;
  status: ROStatusMeta;
};

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1");

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

  const url = `${API_BASE}/ros/active`;
  const res = await axios.get<ActiveRO[]>(url, { params, withCredentials: true });
  return res.data;
}
