import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Plus, CheckCircle, Search, TrendingDown, Clock, Activity, Loader2 } from 'lucide-react';
import { useMitigations } from '../hooks/useMitigations';
import type { Mitigation } from '../types';
import clsx from 'clsx';

function getMitigationTitle(m: Mitigation) {
  return m.title ?? m.description.slice(0, 60);
}

export function MitigationPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');
  const [selectedMitigation, setSelectedMitigation] = useState<Mitigation | null>(null);
  const [addedToplan, setAddedToPlan] = useState<Set<string>>(new Set());

  // FD7: Filter state
  const [filter, setFilter] = useState('');

  const { data: mitigations, isLoading } = useMitigations(runId);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-success-bg flex items-center justify-center mb-[24px]">
          <ShieldCheck className="w-[36px] h-[36px] text-success-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No mitigations generated</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Prioritize risks to begin mitigation planning.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/risks')}>
          Go to Risk Prioritization
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-[28px] h-[28px] text-accent-500 animate-spin" />
      </div>
    );
  }

  // FD7: Client-side filter by title or description
  const filtered = (mitigations ?? []).filter((m) =>
    !filter ||
    (m.title ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    m.description.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleAddToPlan = (id: string) => {
    setAddedToPlan(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderValidationSteps = (steps: string[] | null | undefined) => {
    if (!steps || steps.length === 0) return <p className="text-[13px] text-text-muted">No validation steps provided.</p>;
    return (
      <ul className="list-disc pl-[24px] space-y-[8px] text-[13px] text-text-secondary marker:text-border-focus">
        {steps.map((step, i) => (
          <li key={i} className="pl-[4px]">{step}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Mitigation Planner</h2>
          <p className="text-[13px] text-text-secondary">Evaluate and apply recommended controls against identified risks.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button className="btn-secondary btn-md">Generate Recommendations</button>
        </div>
      </header>

      <div className="flex flex-1 gap-[20px] min-h-0">
        <div className="w-[320px] shrink-0 card-panel flex flex-col p-0 overflow-hidden shadow-sm">
          <div className="p-[16px] border-b border-border-default bg-surface-1">
            <div className="relative mb-[12px]">
              <Search className="w-[14px] h-[14px] absolute left-[12px] top-[10px] text-text-muted" />
              <input
                type="text"
                placeholder="Filter controls..."
                className="input-base w-full pl-[32px] h-[32px] text-[12px]"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase">
              <span>Found Controls ({filtered.length})</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-[12px] space-y-[8px]">
            {filtered.map((m) => {
              const isAdded = addedToplan.has(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMitigation(m)}
                  className={clsx(
                    "p-[12px] rounded-[8px] border cursor-pointer hover:shadow-xs transition-all",
                    selectedMitigation?.id === m.id
                      ? "bg-[#eaf5ef] border-accent-300"
                      : "bg-white border-border-default hover:border-border-strong hover:bg-surface-1"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isAdded ? (
                      <CheckCircle className="w-[12px] h-[12px] text-success-fg" />
                    ) : (
                      <Plus className="w-[12px] h-[12px] text-text-muted" />
                    )}
                    <span className="text-[12px] font-mono font-bold text-text-secondary">{m.id.slice(0, 8)}</span>
                  </div>
                  <h4 className="text-[13px] font-semibold text-text-primary leading-tight line-clamp-2">{getMitigationTitle(m)}</h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* Details Panel */}
        {selectedMitigation ? (
          <div className="flex-1 bg-white border border-border-subtle rounded-[12px] shadow-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-[20px] border-b border-border-subtle flex flex-col pt-[24px]">
              <div className="flex items-center gap-[12px] mb-[16px]">
                <span className="px-[10px] py-[4px] bg-surface-2 text-text-secondary text-[12px] font-semibold uppercase tracking-wider rounded-[6px] border border-border-default">
                  {selectedMitigation.controlType}
                </span>
                <span className="text-[12px] font-mono text-text-muted">ID: {selectedMitigation.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-[20px] font-bold text-text-primary mb-[12px]">
                {getMitigationTitle(selectedMitigation)}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-[20px]">
              <div className="grid grid-cols-2 gap-[16px] mb-[24px]">
                <div className="card-panel shadow-none border-border-default hover:translate-y-0">
                  <h4 className="text-[11px] font-semibold text-text-muted uppercase mb-[10px] flex items-center gap-1">
                    <Clock className="w-[12px] h-[12px]" /> Implementation Effort
                  </h4>
                  <p className={clsx(
                    "text-[16px] font-bold capitalize",
                    selectedMitigation.estimatedEffort === 'low' ? "text-success-fg" : "text-warning-fg"
                  )}>
                    {selectedMitigation.estimatedEffort ?? 'Unknown'} Complexity
                  </p>
                </div>
                <div className="card-panel shadow-none border-border-default hover:translate-y-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#eefbf4] rounded-bl-full -z-10 opacity-50"></div>
                  <h4 className="text-[11px] font-semibold text-text-muted uppercase mb-[10px] flex items-center gap-1">
                    <TrendingDown className="w-[12px] h-[12px]" /> Expected Risk Delta
                  </h4>
                  <div className="flex items-end gap-[8px]">
                    {selectedMitigation.expectedRiskReduction != null ? (
                      <>
                        <span className="text-[24px] font-bold text-[#1b7f55] leading-none">-{selectedMitigation.expectedRiskReduction.toFixed(2)}</span>
                        <span className="text-[13px] font-medium text-text-secondary pb-[2px]">pts</span>
                      </>
                    ) : (
                      <span className="text-[16px] font-semibold text-text-muted">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-[24px]">
                <h4 className="text-[13px] font-semibold text-text-primary border-b border-border-subtle pb-[8px] mb-[12px]">
                  Description
                </h4>
                <p className="text-[13px] text-text-secondary leading-relaxed">{selectedMitigation.description}</p>
              </div>

              <div className="mb-[24px]">
                <h4 className="text-[13px] font-semibold text-text-primary border-b border-border-subtle pb-[8px] mb-[12px]">
                  Targeted Risks
                </h4>
                <div className="flex flex-col gap-[8px]">
                  {(selectedMitigation.riskLinks ?? []).map((link) => (
                    <div key={link.riskItemId} className="flex gap-[12px] items-center p-[12px] bg-surface-1 rounded-[8px] border border-border-default">
                      <span className="font-mono font-bold text-[12px] text-text-secondary shrink-0">{link.riskItemId.slice(0, 8)}</span>
                      <span className={clsx("text-[12px] font-semibold capitalize shrink-0",
                        link.severity === 'critical' ? "text-[#b42318]" :
                        link.severity === 'high' ? "text-[#d14343]" : "text-text-secondary"
                      )}>{link.severity}</span>
                      <span className="text-[12px] text-text-muted ml-auto">Score: {link.finalScore.toFixed(2)}</span>
                    </div>
                  ))}
                  {(selectedMitigation.riskLinks ?? []).length === 0 && (
                    <p className="text-[13px] text-text-muted">No linked risks.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[13px] font-semibold text-text-primary border-b border-border-subtle pb-[8px] mb-[12px]">
                  Validation Plan
                </h4>
                {renderValidationSteps(selectedMitigation.validationSteps)}
              </div>
            </div>

            <div className="p-[20px] bg-surface-1 border-t border-border-subtle flex items-center justify-end gap-[16px]">
              <span className="mr-auto text-[13px] text-text-secondary flex items-center gap-2">
                <Activity className="w-[14px] h-[14px]" /> Simulation preview available
              </span>
              <button className="btn-secondary btn-md border-border-strong bg-white">
                Simulate Impact
              </button>
              <button
                onClick={() => toggleAddToPlan(selectedMitigation.id)}
                className={clsx(
                  "btn-md",
                  addedToplan.has(selectedMitigation.id)
                    ? "bg-border-default text-text-disabled border-border-default cursor-not-allowed"
                    : "btn-primary"
                )}
              >
                {addedToplan.has(selectedMitigation.id) ? 'Added to Plan' : 'Add to Action Plan'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-surface-1 border border-border-default border-dashed rounded-[12px] flex items-center justify-center">
            <p className="text-[14px] text-text-muted font-medium">Select a recommended control from the queue</p>
          </div>
        )}
      </div>
    </div>
  );
}
