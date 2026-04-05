import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User } from '../types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api<User>('/auth/profile'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
