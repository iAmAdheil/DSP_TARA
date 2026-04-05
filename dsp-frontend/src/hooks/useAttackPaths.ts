import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AttackPath } from '../types';

export function useAttackPaths(runId: string | null) {
  return useQuery({
    queryKey: ['attackPaths', runId],
    queryFn: () => api<AttackPath[]>(`/runs/${runId}/attack-paths`),
    enabled: !!runId,
  });
}
