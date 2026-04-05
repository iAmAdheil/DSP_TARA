import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AssetsPayload } from '../types';

export function useAssets(runId: string | null) {
  return useQuery({
    queryKey: ['assets', runId],
    queryFn: () => api<AssetsPayload>(`/runs/${runId}/assets`),
    enabled: !!runId,
  });
}
