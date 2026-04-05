import { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { setActiveProject } from '../../lib/api';
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
  History,
  Shield,
  FolderOpen,
  ChevronDown,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'workspace', label: 'Project Workspace', icon: LayoutDashboard, path: '/' },
    ]
  },
  {
    label: 'Analysis',
    items: [
      { id: 'ingestion', label: 'System Ingestion', icon: FileInput, path: '/ingestion' },
      { id: 'canonical', label: 'Model Explorer', icon: Network, path: '/explorer' },
      { id: 'threats', label: 'Threat Generation', icon: ShieldAlert, path: '/threats' },
      { id: 'cve', label: 'CVE Matching', icon: Bug, path: '/cve' },
      { id: 'paths', label: 'Attack Paths', icon: Route, path: '/paths' },
      { id: 'risk', label: 'Risk Prioritization', icon: BarChart4, path: '/risks' },
    ]
  },
  {
    label: 'Outputs',
    items: [
      { id: 'mitigation', label: 'Mitigation Planner', icon: ShieldCheck, path: '/mitigations' },
      { id: 'subsystem', label: 'Subsystem Explorer', icon: Box, path: '/subsystems' },
      { id: 'reports', label: 'Reports & Export', icon: FileText, path: '/reports' },
      { id: 'history', label: 'Run History', icon: History, path: '/history' },
    ]
  }
];

export function Sidebar() {
  const { sidebarCollapsed, activeRunId, activeProjectId, setActiveProjectId, setProjectModalOpen } = useStore();
  const location = useLocation();
  const { data: projects } = useProjects();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const activeProject = projects?.find((p) => p.id === activeProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside
      className={clsx(
        "bg-[#f0f2f5] border-r border-border-subtle p-[12px_10px] flex flex-col h-full overflow-y-auto transition-all duration-200 z-10",
        sidebarCollapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* Logo */}
      <div className={clsx(
        "h-[36px] rounded-[8px] hover:bg-surface-2 flex items-center cursor-pointer text-primary font-semibold text-[13px] tracking-tight mb-[8px]",
        sidebarCollapsed ? "justify-center" : "px-[10px] justify-between"
      )}>
        {!sidebarCollapsed && <span className="font-semibold">TARA</span>}
        <Shield className="w-[16px] h-[16px] text-accent-500 shrink-0" />
      </div>

      {/* Project Selector */}
      <div className="relative mb-[8px]" ref={dropdownRef}>
        {sidebarCollapsed ? (
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full h-[34px] flex items-center justify-center rounded-[8px] hover:bg-surface-2 transition-colors"
            title={activeProject?.name ?? 'Select project'}
          >
            <FolderOpen className="w-[16px] h-[16px] text-text-secondary" />
          </button>
        ) : (
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={clsx(
              "w-full h-[34px] px-[10px] flex items-center justify-between rounded-[8px] border transition-colors text-left",
              dropdownOpen
                ? "bg-surface-2 border-border-strong"
                : "bg-white border-border-default hover:bg-surface-1 hover:border-border-strong"
            )}
          >
            <div className="flex items-center gap-[8px] min-w-0">
              <FolderOpen className="w-[14px] h-[14px] text-text-muted shrink-0" />
              <span className="text-[13px] font-medium text-text-primary truncate">
                {activeProject?.name ?? 'Select project'}
              </span>
            </div>
            <ChevronDown className={clsx("w-[14px] h-[14px] text-text-muted shrink-0 transition-transform", dropdownOpen && "rotate-180")} />
          </button>
        )}

        {/* Dropdown */}
        {dropdownOpen && (
          <div className={clsx(
            "absolute top-[38px] left-0 bg-white border border-border-default rounded-[10px] shadow-lg z-30 overflow-hidden",
            sidebarCollapsed ? "w-[200px]" : "w-full"
          )}>
            {projects && projects.length > 0 ? (
              <ul className="max-h-[200px] overflow-y-auto">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      onClick={() => {
                        setActiveProjectId(project.id);
                        setDropdownOpen(false);
                        // FD2: Persist active project to backend; invalidate profile cache
                        setActiveProject(project.id)
                          .then(() => queryClient.invalidateQueries({ queryKey: ['profile'] }))
                          .catch(console.error);
                      }}
                      className={clsx(
                        "w-full px-[12px] py-[10px] flex items-start gap-[10px] hover:bg-surface-1 transition-colors text-left",
                        activeProjectId === project.id && "bg-accent-50"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{project.name}</p>
                        <p className="text-[11px] text-text-muted capitalize">
                          {project.domain === 'automotive' ? 'Automotive' : 'General Security'}
                        </p>
                      </div>
                      {activeProjectId === project.id && (
                        <span className="ml-auto shrink-0 w-[6px] h-[6px] rounded-full bg-accent-500 mt-[5px]" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-[12px] py-[10px] text-[13px] text-text-muted">No projects yet</div>
            )}
            <div className="border-t border-border-subtle">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setProjectModalOpen(true);
                }}
                className="w-full px-[12px] py-[10px] flex items-center gap-[8px] hover:bg-surface-1 transition-colors text-left"
              >
                <Plus className="w-[14px] h-[14px] text-accent-600" />
                <span className="text-[13px] font-semibold text-accent-600">+ New Project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
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
                // Append ?runId= to analysis page links when activeRunId is set
                const to = activeRunId && item.path !== '/'
                  ? `${item.path}?runId=${activeRunId}`
                  : item.path;
                return (
                  <li key={item.id}>
                    <Link
                      to={to}
                      className={clsx(
                        "h-[34px] rounded-[8px] flex items-center transition-colors outline-offset-1 focus-visible:outline-2 focus-visible:outline-border-focus",
                        sidebarCollapsed ? "justify-center" : "gap-[8px]",
                        isActive
                          ? `bg-[#e9edf1] text-text-primary border-l-2 border-accent-500 ${!sidebarCollapsed ? 'pl-[8px] pr-[10px]' : ''}`
                          : `text-text-secondary hover:bg-[#eef1f4] hover:text-text-primary border-l-2 border-transparent ${!sidebarCollapsed ? 'pl-[8px] pr-[10px]' : ''}`
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

      {/* System Status */}
      {!sidebarCollapsed && (
        <div className="p-[12px] rounded-[10px] border border-[#e7ecef] bg-linear-to-br from-[#f3f6f8] to-accent-50 relative mt-auto">
          <h4 className="text-[13px] font-semibold text-text-primary mb-1">System Status</h4>
          <p className="text-[12px] text-text-secondary leading-tight">
            {activeProject ? activeProject.name : 'No project selected.'}
          </p>
          <p className="text-[12px] text-text-muted leading-tight mt-0.5">
            {activeRunId ? `Run active.` : 'No active run.'}
          </p>
        </div>
      )}
    </aside>
  );
}
