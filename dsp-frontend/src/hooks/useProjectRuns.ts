import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Run } from '../types';

export function useProjectRuns(projectId: string | null) {
  return useQuery({
    queryKey: ['projectRuns', projectId],
    queryFn: () => api<Run[]>(`/projects/${projectId}/runs`),
    enabled: !!projectId,
  });
}
