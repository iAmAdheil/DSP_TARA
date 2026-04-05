import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useStore } from '../store';
import { ApiError } from '../lib/api';

function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-app">
      <div className="w-[32px] h-[32px] rounded-full border-2 border-border-subtle border-t-accent-500 animate-spin" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError, error } = useProfile();
  const { setUser, setActiveProjectId } = useStore();
  const navigate = useNavigate();

  // FD2: Hydrate store from profile on load (restores activeProjectId across refreshes)
  useEffect(() => {
    if (user) {
      setUser(user);
      if (user.activeProjectId) {
        setActiveProjectId(user.activeProjectId);
      }
    }
  }, [user, setUser, setActiveProjectId]);

  // FD3: Only redirect to /auth on a genuine 401 — not transient network errors
  useEffect(() => {
    if (isError && error instanceof ApiError && error.code === 'UNAUTHORIZED') {
      navigate('/auth', { replace: true });
    }
  }, [isError, error, navigate]);

  if (isLoading) return <FullPageSpinner />;
  if (!user) return null;
  return <>{children}</>;
}
