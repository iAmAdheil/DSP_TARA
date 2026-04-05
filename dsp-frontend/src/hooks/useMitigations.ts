import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Mitigation } from '../types';

export function useMitigations(runId: string | null) {
  return useQuery({
    queryKey: ['mitigations', runId],
    queryFn: () => api<Mitigation[]>(`/runs/${runId}/mitigations`),
    enabled: !!runId,
  });
}
