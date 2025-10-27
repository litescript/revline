// src/api/ros.ts

import { api } from "@/lib/api/client";

/** Summary row shown on Active RO board */
export type ActiveRO = {
  id: number;
  ro_number: string;
  customer_name: string;
  vehicle_label: string; // e.g., "2021 BMW 430i"
  status: string | { status_code?: string; label?: string; [k: string]: unknown };
  is_waiter: boolean;
  updated_at: string; // ISO timestamp
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
  owner?: string | null;   // e.g. "advisor" | "technician" | ...
  waiter?: boolean | null; // filter by waiter flag
  search?: string | null;  // free-text search
  signal?: AbortSignal;    // optional abort
};

/**
 * Fetch list of active repair orders with optional filters.
 * Uses the hardened api client, which:
 *   - injects Authorization if present
 *   - handles 401 by clearing session
 *   - throws AppError on failure
 *   - returns parsed JSON on success
 */
export async function fetchActiveROs(opts: ActiveROQuery = {}): Promise<ActiveRO[]> {
  const { owner, waiter, search, signal } = opts;

  const qs = new URLSearchParams();
  if (owner != null && owner !== "") qs.set("owner", String(owner));
  if (waiter != null) qs.set("waiter", String(waiter));
  if (search != null && search !== "") qs.set("search", String(search));

  const path = `/ros/active${qs.toString() ? `?${qs.toString()}` : ""}`;

  // NOTE: api.get<T>() hits BASE ("/api/v1") automatically.
  return api.get<ActiveRO[]>(path, { signal });
}

/**
 * Fetch full RO detail (line items, advisor, tech, etc.)
 */
export async function fetchROById(id: number): Promise<RODetail> {
  const path = `/ros/${id}`;
  return api.get<RODetail>(path);
}
