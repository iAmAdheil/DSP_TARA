import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CveMatch } from '../types';

export function useCves(runId: string | null) {
  return useQuery({
    queryKey: ['cves', runId],
    queryFn: () => api<CveMatch[]>(`/runs/${runId}/cves`),
    enabled: !!runId,
  });
}
