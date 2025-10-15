import { QueryClient, type QueryCacheNotifyEvent, type MutationCacheNotifyEvent } from '@tanstack/react-query';
import { normalizeError } from './error';
import { toast } from './toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        const { status } = normalizeError(err);
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
      throwOnError: false,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

// Query errors
queryClient.getQueryCache().subscribe((e: QueryCacheNotifyEvent) => {
  if (e.type !== 'updated') return;
  const { state } = e.query;
  if (state.status === 'error' && state.error) {
    const { message } = normalizeError(state.error);
    toast.error(message || 'Request failed');
  }
});

// Mutation errors
queryClient.getMutationCache().subscribe((e: MutationCacheNotifyEvent) => {
  if (e.type !== 'updated') return;
  const { state } = e.mutation;
  if (state.status === 'error' && state.error) {
    const { message } = normalizeError(state.error);
    toast.error(message || 'Action failed');
  }
});
