import { useStore } from '../../store';
import { Menu, Settings, Bell, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TopNav() {
  const { toggleSidebar } = useStore();
  const location = useLocation();

  const getTitle = () => {
    switch(location.pathname) {
      case '/': return 'Project Workspace';
      case '/ingestion': return 'System Ingestion';
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
        <h1 className="text-[14px] font-semibold text-text-primary tracking-tight">
          {getTitle()}
        </h1>
      </div>
      
      <div className="flex items-center gap-[12px]">
        <div className="h-[32px] rounded-full bg-surface-2 p-[2px] flex items-center shadow-xs ml-4 border border-border-subtle text-[12px] font-medium text-text-muted">
          <div className="bg-white rounded-full px-3 py-1 text-text-primary shadow-xs">Edit Mode</div>
          <div className="px-3 py-1 cursor-pointer">View Mode</div>
        </div>

        <div className="w-px h-[20px] bg-border-default mx-2"></div>

        <button className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <Settings className="w-[18px] h-[18px]" />
        </button>
        <button className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border border-transparent hover:bg-surface-2 focus:ring-2 focus:ring-border-focus focus:outline-none text-text-secondary">
          <User className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
