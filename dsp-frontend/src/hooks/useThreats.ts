import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Threat } from '../types';

export function useThreats(runId: string | null) {
  return useQuery({
    queryKey: ['threats', runId],
    queryFn: () => api<Threat[]>(`/runs/${runId}/threats`),
    enabled: !!runId,
  });
}
