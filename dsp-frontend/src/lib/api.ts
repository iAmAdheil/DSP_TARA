import type { User } from '../types';

const BASE = 'http://localhost:4000';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'include',
    ...init,
  });
  const body = await res.json();
  if (!body.ok) throw new ApiError(body.error.code, body.error.message);
  return body.data as T;
}

// FD2: Persist the user's active project to the backend
export function setActiveProject(projectId: string | null) {
  return api<User>('/users/me/active-project', {
    method: 'PATCH',
    body: JSON.stringify({ projectId }),
  });
}
