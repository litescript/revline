import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../lib/api';          // ⬅️ was '@/lib/api'
import { normalizeError } from '../lib/error';   // ⬅️ was '@/lib/error'

type HealthResponse = { status: string } | Record<string, unknown>;

export function HealthStatus() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await getHealth();
      if (error) throw normalizeError(error);
      return data as HealthResponse;
    },
    staleTime: 15_000,
  });

  if (isLoading) return <span>Checking…</span>;
  if (error) {
    const { message } = normalizeError(error);
    return <span className="text-red-600">Health error: {message}</span>;
  }
  return <span>Health: {JSON.stringify(data)}</span>;
}

export default HealthStatus;
