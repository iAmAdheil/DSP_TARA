import { useStore } from '../../store';
import { Menu, Settings, Bell, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

export function TopNav() {
  const { toggleSidebar, viewMode, setViewMode } = useStore();
  const location = useLocation();

  const getTitle = () => {
    switch(location.pathname) {
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
        <button aria-label="Account" title="Account" className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <User className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
