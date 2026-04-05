import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Run } from '../types';

export function useRun(runId: string | null, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => api<Run>(`/runs/${runId}`),
    enabled: !!runId,
    refetchInterval: options?.poll
      ? (query) => {
          const status = query.state.data?.status;
          if (status === 'completed' || status === 'failed') return false;
          return 3000;
        }
      : false,
  });
}
