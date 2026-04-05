import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RiskItem } from '../types';

export function useRisks(runId: string | null) {
  return useQuery({
    queryKey: ['risks', runId],
    queryFn: () => api<RiskItem[]>(`/runs/${runId}/risks`),
    enabled: !!runId,
  });
}
