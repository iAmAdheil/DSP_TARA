import { BoxSelect, ShieldAlert, AlertTriangle, Clock, Play, FileJson } from 'lucide-react';
import { useStore } from '../store';

export function ProjectWorkspace() {
  const { activeRunId } = useStore();

  if (!activeRunId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-[64px] h-[64px] rounded-full bg-surface-2 flex items-center justify-center mb-[24px]">
          <ShieldAlert className="w-[32px] h-[32px] text-text-muted" />
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-text-primary mb-[8px]">
          No analysis run yet
        </h2>
        <p className="text-[14px] text-text-secondary mb-[32px] max-w-sm text-center leading-relaxed">
          Start a new threat analysis run by ingesting your system model, or import a previous run from JSON.
        </p>
        <div className="flex items-center gap-[16px]">
          <button className="btn-lg btn-primary shadow-sm group">
            <Play className="w-[16px] h-[16px] mr-[8px] group-hover:scale-110 transition-transform" />
            Start New Run
          </button>
          <button className="btn-lg btn-secondary">
            <FileJson className="w-[16px] h-[16px] mr-[8px] text-text-muted" />
            Import Run JSON
          </button>
        </div>
      </div>
    );
  }

  // Loaded State
  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-[32px]">
        <div className="flex items-center text-[12px] text-text-muted mb-[8px]">
          Workspace / Overview
        </div>
        <h2 className="text-[24px] font-bold text-text-primary tracking-tight">Project Summary</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px]">
        {/* Assets Card */}
        <div className="card-panel card-interactive">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="text-[14px] font-semibold text-text-primary">Total Assets</h3>
            <div className="p-[8px] rounded-[8px] bg-info-bg text-info-fg">
              <BoxSelect className="w-[16px] h-[16px]" />
            </div>
          </div>
          <p className="text-[32px] font-bold text-text-primary mb-[4px]">24</p>
          <p className="text-[13px] text-text-muted">4 external interfaces</p>
        </div>

        {/* Threats Card */}
        <div className="card-panel card-interactive">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="text-[14px] font-semibold text-text-primary">Identified Threats</h3>
            <div className="p-[8px] rounded-[8px] bg-warning-bg text-warning-fg">
              <ShieldAlert className="w-[16px] h-[16px]" />
            </div>
          </div>
          <p className="text-[32px] font-bold text-text-primary mb-[4px]">138</p>
          <p className="text-[13px] text-text-muted">Generated across 6 categories</p>
        </div>

        {/* Critical/High Risks Card */}
        <div className="card-panel card-interactive">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="text-[14px] font-semibold text-text-primary">High-Risk Items</h3>
            <div className="p-[8px] rounded-[8px] bg-danger-bg text-danger-fg">
              <AlertTriangle className="w-[16px] h-[16px]" />
            </div>
          </div>
          <p className="text-[32px] font-bold text-text-primary mb-[4px]">12</p>
          <div className="flex gap-[8px] mt-[8px]">
            <span className="tag-critical">5 Critical</span>
            <span className="tag-high">7 High</span>
          </div>
        </div>

        {/* Update Card */}
        <div className="card-panel card-interactive">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="text-[14px] font-semibold text-text-primary">Last Updated</h3>
            <div className="p-[8px] rounded-[8px] bg-surface-2 text-text-secondary">
              <Clock className="w-[16px] h-[16px]" />
            </div>
          </div>
          <p className="text-[20px] font-semibold text-text-primary mb-[8px] mt-[10px]">2h ago</p>
          <p className="text-[13px] text-text-muted">Run ID: #8xyz-2a</p>
        </div>
      </div>
    </div>
  );
}
