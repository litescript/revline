// frontend/src/api/ros.ts
import http from "@/lib/api/client";

/** Summary row shown on Active RO board */
export type ActiveRO = {
  id: number;
  ro_number: string;
  customer_name: string;
  vehicle_label: string; // e.g., "2021 BMW 430i"
  status: string | { status_code?: string; label?: string; [k: string]: unknown };
  is_waiter: boolean;
  updated_at: string; // ISO
  opened_at?: string | null;
};

/** Full detail for inline panel */
export type ROLineItem = {
  id: number;
  code: string;
  description: string;
  qty: number;
  hours?: number | null;
  price?: number | null;
  status?: string | null;
};

export type RODetail = {
  id: number;
  ro_number: string;
  customer_name: string;
  vehicle_label: string;
  status: string | { status_code?: string; label?: string; [k: string]: unknown };
  is_waiter: boolean;
  updated_at: string;
  notes?: string | null;
  advisor_name?: string | null;
  technician_name?: string | null;
  line_items?: ROLineItem[];
};

/** Query params for active ROs (used by useActiveROs hook) */
export type ActiveROQuery = {
  owner?: string | null;   // e.g., "advisor" | "technician" | ...
  waiter?: boolean | null; // filter by waiter flag
  search?: string | null;  // free-text search
  signal?: AbortSignal;    // optional abort
};

/**
 * NOTE: your http() may return either a Response or already-parsed JSON.
 * We handle both shapes without using generics.
 */
export async function fetchActiveROs(opts: ActiveROQuery = {}): Promise<ActiveRO[]> {
  const { owner, waiter, search, signal } = opts;

  const qs = new URLSearchParams();
  if (owner != null && owner !== "") qs.set("owner", String(owner));
  if (waiter != null) qs.set("waiter", String(waiter));
  if (search != null && search !== "") qs.set("search", String(search));

  const url = `/api/v1/ros/active${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res: any = await http(url, { method: "GET", signal } as any);

  if (res && typeof res.json === "function") {
    return (res as Response).json() as Promise<ActiveRO[]>;
  }
  return res as ActiveRO[];
}

export async function fetchROById(id: number): Promise<RODetail> {
  const res: any = await http(`/api/v1/ros/${id}`, { method: "GET" } as any);
  if (res && typeof res.json === "function") {
    return (res as Response).json() as Promise<RODetail>;
  }
  return res as RODetail;
}
