import { BoxSelect, ShieldAlert, AlertTriangle, Clock, Play, FileJson, LayoutDashboard, History } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import mockRuns from '../mock-data/runs.json';

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

      {/* Recent Runs */}
      <div className="mt-[32px] card-panel p-0 overflow-hidden">
        <div className="flex items-center justify-between px-[20px] py-[14px] border-b border-border-default bg-surface-1">
          <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-[8px]">
            <History className="w-[13px] h-[13px]" /> Recent Runs
          </h3>
          <button className="text-[12px] font-semibold text-accent-600 hover:text-accent-700 transition-colors" onClick={() => navigate('/history')}>
            View All →
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#fcfcfd] border-b border-border-subtle">
            <tr className="text-[12px] text-text-muted uppercase font-semibold tracking-wider">
              <th className="px-[20px] py-[10px]">Run ID</th>
              <th className="px-[20px] py-[10px]">Status</th>
              <th className="px-[20px] py-[10px]">Date</th>
              <th className="px-[20px] py-[10px] text-right">Assets</th>
              <th className="px-[20px] py-[10px] text-right">Threats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {mockRuns.slice(0, 3).map((r, i) => (
              <tr key={i} className={`hover:bg-surface-1 transition-colors ${activeRunId === r.run_id ? 'bg-[#eaf5ef]' : ''}`}>
                <td className="px-[20px] py-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono font-bold text-text-secondary">{r.run_id}</span>
                    {activeRunId === r.run_id && <span className="bg-accent-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">Active</span>}
                  </div>
                </td>
                <td className="px-[20px] py-[12px]">
                  {r.status === 'completed'
                    ? <span className="tag-low bg-success-bg text-success-fg">Completed</span>
                    : <span className="tag-high bg-danger-bg text-danger-fg">Failed</span>}
                </td>
                <td className="px-[20px] py-[12px] text-[13px] text-text-primary">{r.timestamp}</td>
                <td className="px-[20px] py-[12px] text-[13px] font-semibold text-right text-text-primary">{r.assets_analyzed}</td>
                <td className="px-[20px] py-[12px] text-[13px] font-semibold text-right text-text-primary">{r.threats_generated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
