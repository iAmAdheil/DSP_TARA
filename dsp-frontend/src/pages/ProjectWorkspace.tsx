import { useEffect, type MouseEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useRun } from '../hooks/useRun';
import { api } from '../lib/api';
import type { Run } from '../types';
import { useAssets } from '../hooks/useAssets';
import { useThreats } from '../hooks/useThreats';
import { useRisks } from '../hooks/useRisks';
import { useCves } from '../hooks/useCves';
import {
  BoxSelect, ShieldAlert, AlertTriangle, Play, Plus, X,
  LayoutDashboard, CheckCircle2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import clsx from 'clsx';

// Status dot colors for run tabs
function StatusDot({ status }: { status: Run['status'] }) {
  return (
    <span className={clsx(
      "inline-block w-[6px] h-[6px] rounded-full shrink-0",
      status === 'completed' ? "bg-success-fg" :
      status === 'running'   ? "bg-warning-fg" :
      status === 'failed'    ? "bg-[#b42318]" :
      "bg-text-disabled"
    )} />
  );
}

const STEP_KEYS: Array<keyof Run['steps']> = ['ingestion', 'threats', 'cves', 'attack_paths', 'risk', 'mitigations'];
const STEP_LABELS: Record<keyof Run['steps'], string> = {
  ingestion: 'Ingestion',
  threats: 'Threats',
  cves: 'CVE Matching',
  attack_paths: 'Attack Paths',
  risk: 'Risk Scoring',
  mitigations: 'Mitigations',
};

function RunStepsProgress({ run }: { run: Run }) {
  return (
    <div className="flex items-center gap-[6px] flex-wrap">
      {STEP_KEYS.map((key, idx) => {
        const s = run.steps[key];
        return (
          <div key={key} className="flex items-center gap-[6px]">
            <div className={clsx(
              "flex items-center gap-[4px] px-[8px] py-[4px] rounded-full text-[11px] font-semibold",
              s === 'completed' ? "bg-success-bg text-success-fg" :
              s === 'running'   ? "bg-warning-bg text-warning-fg" :
              s === 'failed'    ? "bg-danger-bg text-danger-fg" :
              "bg-surface-2 text-text-disabled"
            )}>
              {s === 'completed' && <CheckCircle2 className="w-[10px] h-[10px]" />}
              {s === 'running'   && <Loader2 className="w-[10px] h-[10px] animate-spin" />}
              {s === 'failed'    && <AlertCircle className="w-[10px] h-[10px]" />}
              {STEP_LABELS[key]}
            </div>
            {idx < STEP_KEYS.length - 1 && <div className="w-[12px] h-px bg-border-strong" />}
          </div>
        );
      })}
    </div>
  );
}

function ActiveRunView({ runId }: { runId: string }) {
  const navigate = useNavigate();
  const { data: run } = useRun(runId, { poll: true });

  const isCompleted = run?.status === 'completed';

  const { data: assetsData } = useAssets(isCompleted ? runId : null);
  const { data: threats } = useThreats(isCompleted ? runId : null);
  const { data: risks } = useRisks(isCompleted ? runId : null);
  const { data: cves } = useCves(isCompleted ? runId : null);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="w-[24px] h-[24px] rounded-full border-2 border-border-subtle border-t-accent-500 animate-spin" />
      </div>
    );
  }

  const highRiskCount = risks?.filter(r => r.severity === 'critical' || r.severity === 'high').length ?? 0;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Run header */}
      <div className="flex items-center gap-[12px] mb-[24px]">
        <div>
          <div className="flex items-center text-[12px] text-text-muted mb-[4px]">
            Run ID: <span className="font-mono ml-1">{run.id}</span>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className={clsx(
              "text-[12px] font-bold uppercase px-[8px] py-[3px] rounded-full",
              run.status === 'completed' ? "bg-success-bg text-success-fg" :
              run.status === 'running'   ? "bg-warning-bg text-warning-fg" :
              run.status === 'failed'    ? "bg-danger-bg text-danger-fg" :
              "bg-surface-2 text-text-muted"
            )}>
              {run.status}
            </span>
            {run.status === 'running' && (
              <Loader2 className="w-[14px] h-[14px] text-warning-fg animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="mb-[28px]">
        <h3 className="text-[12px] font-semibold text-text-muted uppercase mb-[12px]">Pipeline Steps</h3>
        <RunStepsProgress run={run} />
        {run.status === 'failed' && run.errorMessage && (
          <p className="text-[13px] text-[#b42318] mt-[8px] flex items-center gap-2">
            <AlertCircle className="w-[14px] h-[14px]" />
            {run.errorMessage}
          </p>
        )}
      </div>

      {/* Stat cards — only once completed */}
      {isCompleted && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px] mb-[28px]">
            <div className="card-panel card-interactive">
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[14px] font-semibold text-text-primary">Total Assets</h3>
                <div className="p-[8px] rounded-[8px] bg-info-bg text-info-fg">
                  <BoxSelect className="w-[16px] h-[16px]" />
                </div>
              </div>
              <p className="text-[32px] font-bold text-text-primary mb-[4px]">{assetsData?.assets.length ?? '—'}</p>
              <p className="text-[13px] text-text-muted">Canonical model nodes</p>
            </div>

            <div className="card-panel card-interactive">
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[14px] font-semibold text-text-primary">Identified Threats</h3>
                <div className="p-[8px] rounded-[8px] bg-warning-bg text-warning-fg">
                  <ShieldAlert className="w-[16px] h-[16px]" />
                </div>
              </div>
              <p className="text-[32px] font-bold text-text-primary mb-[4px]">{threats?.length ?? '—'}</p>
              <p className="text-[13px] text-text-muted">STRIDE/HEAVENS hypotheses</p>
            </div>

            <div className="card-panel card-interactive">
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[14px] font-semibold text-text-primary">High-Risk Items</h3>
                <div className="p-[8px] rounded-[8px] bg-danger-bg text-danger-fg">
                  <AlertTriangle className="w-[16px] h-[16px]" />
                </div>
              </div>
              <p className="text-[32px] font-bold text-text-primary mb-[4px]">{highRiskCount}</p>
              <div className="flex gap-[8px] mt-[8px]">
                <span className="tag-critical">{risks?.filter(r => r.severity === 'critical').length ?? 0} Critical</span>
                <span className="tag-high">{risks?.filter(r => r.severity === 'high').length ?? 0} High</span>
              </div>
            </div>

            <div className="card-panel card-interactive">
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[14px] font-semibold text-text-primary">CVEs Matched</h3>
                <div className="p-[8px] rounded-[8px] bg-surface-2 text-text-secondary">
                  <Clock className="w-[16px] h-[16px]" />
                </div>
              </div>
              <p className="text-[32px] font-bold text-text-primary mb-[4px]">{cves?.length ?? '—'}</p>
              <p className="text-[13px] text-text-muted">NVD matches found</p>
            </div>
          </div>

          {/* View Results links */}
          <div className="card-panel p-0 overflow-hidden">
            <div className="px-[20px] py-[14px] border-b border-border-default bg-surface-1">
              <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider">View Results</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-border-subtle">
              {[
                { label: 'Threat Generation', path: '/threats' },
                { label: 'CVE Matching', path: '/cve' },
                { label: 'Attack Paths', path: '/paths' },
                { label: 'Risk Prioritization', path: '/risks' },
                { label: 'Mitigation Planner', path: '/mitigations' },
                { label: 'Model Explorer', path: '/explorer' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(`${link.path}?runId=${runId}`)}
                  className="px-[20px] py-[14px] text-left hover:bg-surface-1 transition-colors group"
                >
                  <span className="text-[13px] font-medium text-text-primary group-hover:text-accent-600 transition-colors">{link.label} →</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {(run.status === 'queued' || run.status === 'running') && (
        <div className="card-panel flex items-center gap-[16px]">
          <Loader2 className="w-[20px] h-[20px] text-accent-500 animate-spin shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-text-primary">Analysis in progress</p>
            <p className="text-[13px] text-text-muted">Results will appear here once the pipeline completes.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectWorkspace() {
  const { activeRunId, openRunIds, setActiveRunId, addOpenRunId, removeOpenRunId, activeProjectId, setProjectModalOpen } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync URL → store on mount / URL change
  // FD2 (Gap 9): If runId is in URL but not in openRunIds (e.g. bookmark/shared link), fetch and open it
  useEffect(() => {
    const urlRunId = searchParams.get('runId');
    if (!urlRunId) return;
    if (openRunIds.includes(urlRunId)) {
      if (urlRunId !== activeRunId) setActiveRunId(urlRunId);
    } else {
      api<Run>(`/runs/${urlRunId}`)
        .then((run) => {
          addOpenRunId(run.id);
          setActiveRunId(run.id);
        })
        .catch(() => {
          // run not found or not owned — ignore, page shows empty state
        });
    }
  }, [searchParams]);

  const handleTabClick = (runId: string) => {
    setActiveRunId(runId);
    setSearchParams({ runId });
  };

  const handleTabClose = (e: MouseEvent, runId: string) => {
    e.stopPropagation();
    removeOpenRunId(runId);
    if (activeRunId === runId) {
      const remaining = openRunIds.filter(id => id !== runId);
      if (remaining.length > 0) {
        setSearchParams({ runId: remaining[0] });
      } else {
        setSearchParams({});
      }
    }
  };

  // Empty state: no project selected
  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <LayoutDashboard className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">
          Select or create a project to get started
        </h2>
        <p className="text-[13px] text-text-secondary mb-[24px] max-w-sm mx-auto">
          Choose an existing project from the sidebar or create a new one to begin your threat analysis.
        </p>
        <button className="btn-primary btn-md flex items-center" onClick={() => setProjectModalOpen(true)}>
          <Plus className="w-[14px] h-[14px] mr-[6px]" />
          New Project
        </button>
      </div>
    );
  }

  // Empty state: project selected but no runs
  if (openRunIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <LayoutDashboard className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No runs yet</h2>
        <p className="text-[13px] text-text-secondary mb-[24px] max-w-sm mx-auto">
          Start a new analysis run by ingesting your system model.
        </p>
        <button className="btn-primary btn-md flex items-center" onClick={() => navigate('/ingestion')}>
          <Play className="w-[14px] h-[14px] mr-[6px]" />
          Start Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Tab bar */}
      <div className="flex items-center gap-[4px] mb-[20px] border-b border-border-default pb-0 overflow-x-auto no-scrollbar">
        {openRunIds.map((runId) => (
          <RunTab
            key={runId}
            runId={runId}
            isActive={activeRunId === runId}
            onClick={() => handleTabClick(runId)}
            onClose={(e) => handleTabClose(e, runId)}
          />
        ))}
        <button
          onClick={() => navigate('/ingestion')}
          className="h-[36px] w-[36px] shrink-0 flex items-center justify-center rounded-t-[8px] border border-b-0 border-border-default text-text-muted hover:text-accent-600 hover:bg-surface-1 transition-colors ml-[4px]"
          title="New run"
        >
          <Plus className="w-[14px] h-[14px]" />
        </button>
      </div>

      {/* Active run content */}
      {activeRunId ? (
        <ActiveRunView key={activeRunId} runId={activeRunId} />
      ) : (
        <div className="flex items-center justify-center h-[200px] text-text-muted text-[14px]">
          Select a run tab above to view results.
        </div>
      )}
    </div>
  );
}

function RunTab({
  runId,
  isActive,
  onClick,
  onClose,
}: {
  runId: string;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: MouseEvent) => void;
}) {
  const { data: run } = useRun(runId, { poll: true });
  const shortId = runId.slice(0, 8);
  const status = run?.status ?? 'queued';

  // FD4: Changed outer element from <button> to <div role="button"> to fix invalid nested <button>
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={clsx(
        "h-[36px] px-[12px] flex items-center gap-[8px] rounded-t-[8px] border border-b-0 text-[12px] font-medium transition-colors shrink-0 cursor-pointer select-none",
        isActive
          ? "bg-white border-border-default text-text-primary shadow-[0_1px_0_white]"
          : "bg-surface-1 border-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary"
      )}
    >
      <StatusDot status={status} />
      <span className="font-mono">#{shortId}</span>
      <button
        onClick={onClose}
        className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
      >
        <X className="w-[10px] h-[10px]" />
      </button>
    </div>
  );
}
