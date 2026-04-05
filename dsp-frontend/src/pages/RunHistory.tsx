import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useProjectRuns } from '../hooks/useProjectRuns';
import { FileJson, GitCompare, Loader2 } from 'lucide-react';

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function RunHistory() {
  const navigate = useNavigate();
  const { activeRunId, activeProjectId, addOpenRunId, setActiveRunId } = useStore();
  const { data: runs, isLoading } = useProjectRuns(activeProjectId);

  const handleRowClick = (runId: string) => {
    addOpenRunId(runId);
    setActiveRunId(runId);
    navigate(`/?runId=${runId}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px]">
        <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Run History</h2>
        <p className="text-[13px] text-text-secondary">Explore historically generated snapshots, baselines and configuration setups.</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-[24px] h-[24px] text-accent-500 animate-spin" />
        </div>
      ) : !activeProjectId ? (
        <div className="flex items-center justify-center h-[200px] text-[14px] text-text-muted">
          Select a project to view its run history.
        </div>
      ) : (
        <div className="card-panel overflow-hidden p-0">
          <div className="bg-surface-1 py-[12px] px-[20px] border-b border-border-default flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider">Analysis Execution Log</h3>
          </div>

          <table className="w-full text-left">
            <thead className="bg-[#fcfcfd] border-b border-border-subtle">
              <tr className="text-[12px] text-text-muted uppercase font-semibold tracking-wider">
                <th className="px-[20px] py-[12px]">Run ID</th>
                <th className="px-[20px] py-[12px]">Status</th>
                <th className="px-[20px] py-[12px]">Date Executed</th>
                <th className="px-[20px] py-[12px]">Model Version</th>
                <th className="px-[20px] py-[12px] text-right">Duration</th>
                <th className="px-[20px] py-[12px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {(runs ?? []).map((r) => (
                <tr
                  key={r.id}
                  onClick={() => handleRowClick(r.id)}
                  className={`hover:bg-surface-1 transition-colors cursor-pointer ${activeRunId === r.id ? 'bg-[#eaf5ef]' : ''}`}
                >
                  <td className="px-[20px] py-[14px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-bold text-text-secondary">{r.id.slice(0, 12)}</span>
                      {activeRunId === r.id && <span className="bg-accent-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">Active</span>}
                    </div>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    {r.status === 'completed' ? (
                      <span className="tag-low bg-success-bg text-success-fg">Completed</span>
                    ) : r.status === 'failed' ? (
                      <span className="tag-high bg-danger-bg text-danger-fg">Failed</span>
                    ) : r.status === 'running' ? (
                      <span className="tag-medium bg-warning-bg text-warning-fg">Running</span>
                    ) : (
                      <span className="tag-low bg-surface-2 text-text-muted">Queued</span>
                    )}
                  </td>
                  <td className="px-[20px] py-[14px] text-[13px] text-text-primary">
                    {new Date(r.startedAt).toLocaleString()}
                  </td>
                  <td className="px-[20px] py-[14px] text-[13px] font-mono text-text-secondary">
                    {r.modelVersion ?? '—'}
                  </td>
                  <td className="px-[20px] py-[14px] text-[13px] text-right text-text-primary">
                    {formatDuration(r.startedAt, r.completedAt)}
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <div className="flex items-center justify-center gap-[8px]" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded border border-transparent hover:border-border-default transition-all" title="View JSON Snapshot">
                        <FileJson className="w-[14px] h-[14px]" />
                      </button>
                      {r.status === 'completed' && (
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded border border-transparent hover:border-border-default transition-all" title="Diff Against Active">
                          <GitCompare className="w-[14px] h-[14px]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {runs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-[20px] py-[40px] text-center text-[13px] text-text-muted">
                    No runs found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
