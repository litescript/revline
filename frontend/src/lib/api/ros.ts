// src/lib/api/ros.ts
export type ROLineDTO = {
  id: number;
  line_type: "labor" | "part" | string;
  description: string;
  qty?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
};

export type RODetailDTO = {
  id: number;
  ro_number: string;
  status_code: string;
  status_label: string;
  opened_at: string;
  updated_at: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  vehicle_id: number;
  vehicle_label: string;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  license_plate?: string | null;
  lines: ROLineDTO[];
};

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.PROD ? "/api/v1" : "http://localhost:8000/api/v1");

export async function getRODetail(id: string | number): Promise<RODetailDTO> {
  const res = await fetch(`${API_BASE}/ros/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
