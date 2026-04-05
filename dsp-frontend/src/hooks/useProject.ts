import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Project } from '../types';

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}
