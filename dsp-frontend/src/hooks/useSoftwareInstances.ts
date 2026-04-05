import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SoftwareInstance } from '../types';

export function useSoftwareInstances(runId: string | null) {
  return useQuery({
    queryKey: ['software-instances', runId],
    queryFn: () => api<SoftwareInstance[]>(`/runs/${runId}/software-instances`),
    enabled: !!runId,
  });
}
