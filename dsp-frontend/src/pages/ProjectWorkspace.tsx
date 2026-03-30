import { BoxSelect, ShieldAlert, AlertTriangle, Clock, Play, FileJson, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

export function ProjectWorkspace() {
  const { activeRunId } = useStore();
  const navigate = useNavigate();

  if (!activeRunId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <LayoutDashboard className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">
          No analysis run yet
        </h2>
        <p className="text-[13px] text-text-secondary mb-[24px] max-w-sm mx-auto">
          Start a new threat analysis run by ingesting your system model, or import a previous run from JSON.
        </p>
        <div className="flex items-center justify-center gap-[12px]">
          <button className="btn-primary btn-md flex items-center" onClick={() => navigate('/ingestion')}>
            <Play className="w-[14px] h-[14px] mr-[6px]" />
            Start New Run
          </button>
          <button className="btn-secondary btn-md flex items-center">
            <FileJson className="w-[14px] h-[14px] mr-[6px]" />
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
