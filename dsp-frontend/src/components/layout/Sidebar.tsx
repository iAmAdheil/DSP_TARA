import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { 
  LayoutDashboard, 
  FileInput, 
  Network, 
  ShieldAlert, 
  Bug, 
  Route, 
  BarChart4, 
  ShieldCheck, 
  Box, 
  FileText, 
  History 
} from 'lucide-react';
import clsx from 'clsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'workspace', label: 'Project Workspace', icon: LayoutDashboard, path: '/' },
    ]
  },
  {
    label: 'Model Processing',
    items: [
      { id: 'ingestion', label: 'System Ingestion', icon: FileInput, path: '/ingestion' },
      { id: 'canonical', label: 'Model Explorer', icon: Network, path: '/explorer' },
    ]
  },
  {
    label: 'Analysis Engine',
    items: [
      { id: 'threats', label: 'Threat Generation', icon: ShieldAlert, path: '/threats' },
      { id: 'cve', label: 'CVE Matching', icon: Bug, path: '/cve' },
      { id: 'paths', label: 'Attack Paths', icon: Route, path: '/paths' },
      { id: 'risk', label: 'Risk Prioritization', icon: BarChart4, path: '/risks' },
    ]
  },
  {
    label: 'Resolution',
    items: [
      { id: 'mitigation', label: 'Mitigation Planner', icon: ShieldCheck, path: '/mitigations' },
      { id: 'subsystem', label: 'Subsystem Explorer', icon: Box, path: '/subsystems' },
    ]
  },
  {
    label: 'Records',
    items: [
      { id: 'reports', label: 'Reports & Export', icon: FileText, path: '/reports' },
      { id: 'history', label: 'Run History', icon: History, path: '/history' },
    ]
  }
];

export function Sidebar() {
  const { sidebarCollapsed } = useStore();
  const location = useLocation();

  return (
    <aside 
      className={clsx(
        "bg-surface-1 border-r border-border-subtle p-[12px_10px] flex flex-col h-full overflow-y-auto transition-all duration-200 z-10",
        sidebarCollapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* Workspace Selector */}
      <div className="h-[36px] px-[10px] rounded-[8px] hover:bg-surface-2 flex items-center justify-between cursor-pointer text-primary font-semibold text-[13px] tracking-tight mb-[16px]">
        {!sidebarCollapsed && <span>TARA Project Beta</span>}
        <div className="w-[16px] h-[16px] rounded bg-border-strong shrink-0"></div>
      </div>

      <nav className="flex-1 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-[16px]">
            {!sidebarCollapsed && (
              <h3 className="text-[11px] leading-[16px] font-semibold text-text-muted uppercase mb-2 px-[10px]">
                {group.label}
              </h3>
            )}
            <ul className="space-y-[4px]">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={clsx(
                        "h-[34px] px-[10px] rounded-[8px] flex items-center gap-[8px] transition-colors outline-offset-1 focus-visible:outline-2 focus-visible:outline-border-focus",
                        isActive 
                          ? "bg-[#e9edf1] text-text-primary" 
                          : "text-text-secondary hover:bg-[#eef1f4] hover:text-text-primary"
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="w-[16px] h-[16px] shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="text-[13px] font-medium truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="p-[12px] rounded-[10px] border border-[#e7ecef] bg-linear-to-br from-[#f3f6f8] to-accent-50 relative mt-auto">
          <h4 className="text-[13px] font-semibold text-text-primary mb-1">System Status</h4>
          <p className="text-[12px] text-text-secondary leading-tight">All modules fully operational. 248 items stored.</p>
        </div>
      )}
    </aside>
  );
}
