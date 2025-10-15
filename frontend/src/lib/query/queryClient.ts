import { QueryClient } from '@tanstack/react-query';
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

queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'query' && event.action?.type === 'updated') {
    const q = event.query;
    if (q.state.status === 'error' && q.state.error) {
      const { message } = normalizeError(q.state.error);
      toast.error(message || 'Request failed');
    }
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event?.type === 'mutation' && event.action?.type === 'error') {
    const err = (event as any).action?.error;
    const { message } = normalizeError(err);
    toast.error(message || 'Action failed');
  }
});
