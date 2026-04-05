import { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Menu, Settings, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

export function TopNav() {
  const { toggleSidebar, viewMode, setViewMode, user, setUser, setActiveProjectId, setActiveRunId } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Project Workspace';
      case '/ingestion': return 'System Ingestion';
      case '/explorer': return 'Model Explorer';
      case '/threats': return 'Threat Generation';
      case '/cve': return 'CVE Matching';
      case '/paths': return 'Attack Paths';
      case '/risks': return 'Risk Prioritization';
      case '/mitigations': return 'Mitigation Planner';
      case '/subsystems': return 'Subsystem Explorer';
      case '/reports': return 'Reports & Export';
      case '/history': return 'Run History';
      default: return 'TARA Project';
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FD9: Clear query cache and store state on sign-out
  // Note: the httpOnly JWT cookie cannot be cleared client-side — it will expire naturally (7d).
  const handleSignOut = () => {
    queryClient.clear();
    setUser(null);
    setActiveProjectId(null);
    setActiveRunId(null);
    setAccountMenuOpen(false);
    navigate('/auth', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="h-[56px] bg-surface-0 border-b border-border-subtle px-[20px] flex items-center justify-between z-20">
      <div className="flex items-center gap-[16px]">
        <button
          onClick={toggleSidebar}
          className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted leading-none mb-0.5">TARA</span>
          <h1 className="text-[14px] font-semibold text-text-primary tracking-tight leading-none">{getTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-[12px]">
        <div className="h-[32px] rounded-full bg-surface-2 p-[2px] flex items-center shadow-xs ml-4 border border-border-subtle text-[12px] font-medium text-text-muted">
          <div
            onClick={() => setViewMode('edit')}
            className={clsx("rounded-full px-3 py-1 cursor-pointer transition-all", viewMode === 'edit' ? "bg-white text-text-primary font-semibold shadow-sm" : "text-text-muted hover:text-text-primary")}
          >
            Edit Mode
          </div>
          <div
            onClick={() => setViewMode('view')}
            className={clsx("rounded-full px-3 py-1 cursor-pointer transition-all", viewMode === 'view' ? "bg-white text-text-primary font-semibold shadow-sm" : "text-text-muted hover:text-text-primary")}
          >
            View Mode
          </div>
        </div>

        <div className="w-px h-[20px] bg-border-default mx-2"></div>

        <button aria-label="Notifications" title="Notifications" className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button aria-label="Settings" title="Settings" className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Account button with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="flex items-center gap-[6px] h-[32px] px-[8px] rounded-[8px] border border-transparent hover:bg-surface-2 transition-colors text-text-secondary"
            title={user?.name ?? 'Account'}
          >
            <div className="w-[22px] h-[22px] rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">
              {initials}
            </div>
            {user?.name && (
              <span className="text-[12px] font-medium text-text-primary hidden sm:block max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
            )}
            <ChevronDown className={clsx("w-[12px] h-[12px] transition-transform", accountMenuOpen && "rotate-180")} />
          </button>

          {accountMenuOpen && (
            <div className="absolute right-0 top-[36px] bg-white border border-border-default rounded-[10px] shadow-lg z-30 w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {user && (
                <div className="px-[12px] py-[10px] border-b border-border-subtle">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{user.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full px-[12px] py-[10px] flex items-center gap-[8px] hover:bg-surface-1 transition-colors text-left text-[13px] font-medium text-text-secondary hover:text-text-primary"
              >
                <LogOut className="w-[14px] h-[14px]" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
