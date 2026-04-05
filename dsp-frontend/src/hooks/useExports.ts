import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Report } from '../types';

export function useExports(runId: string | null, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['exports', runId],
    queryFn: () => api<Report[]>(`/runs/${runId}/exports`),
    enabled: !!runId,
    refetchInterval: options?.poll
      ? (query) => {
          const reports = query.state.data;
          if (!reports || reports.length === 0) return false;
          const hasPending = reports.some(
            (r) => r.status === 'queued' || r.status === 'running'
          );
          return hasPending ? 3000 : false;
        }
      : false,
  });
}
