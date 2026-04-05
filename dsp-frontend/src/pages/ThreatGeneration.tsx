import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, Download, SlidersHorizontal, ChevronRight, X, Loader2 } from 'lucide-react';
import { useThreats } from '../hooks/useThreats';
import type { Threat } from '../types';
import clsx from 'clsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getThreatTitle(t: Threat) {
  return t.title ?? t.description.slice(0, 60);
}

// STRIDE ordering: S, T, R, I, D, E
const STRIDE_CATEGORY_ORDER: Record<string, number> = { S: 0, T: 1, R: 2, I: 3, D: 4, E: 5 };
// HEAVENS ordering: H, E, A, V, N, S (letters of the word)
const HEAVENS_CATEGORY_ORDER: Record<string, number> = { H: 0, E: 1, A: 2, V: 3, N: 4, S: 5 };

function categoryOrder(category: string, framework: 'stride' | 'heavens'): number {
  const letter = category[0]?.toUpperCase() ?? 'Z';
  const map = framework === 'stride' ? STRIDE_CATEGORY_ORDER : HEAVENS_CATEGORY_ORDER;
  return map[letter] ?? 99;
}

function sortThreats(threats: Threat[], framework: 'stride' | 'heavens'): Threat[] {
  return [...threats].sort((a, b) => {
    const catDiff = categoryOrder(a.category, framework) - categoryOrder(b.category, framework);
    if (catDiff !== 0) return catDiff;
    return b.confidence - a.confidence;
  });
}

// ─── Severity badge ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  extreme: 'bg-danger-bg text-danger-fg border border-danger-fg/20',
  high:    'bg-warning-bg text-warning-fg border border-warning-fg/20',
  medium:  'bg-[#fef9c3] text-[#854d0e] border border-[#854d0e]/20',
  low:     'bg-success-bg text-success-fg border border-success-fg/20',
};

function SeverityBadge({ severity }: { severity: Threat['severity'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-semibold uppercase tracking-wide',
      SEVERITY_STYLES[severity ?? 'low'],
    )}>
      {severity ?? 'low'}
    </span>
  );
}

// ─── Impact breakdown row ────────────────────────────────────────────────────

type ImpactBreakdown = {
  safetyImpact?: string | null;
  financialImpact?: string | null;
  operationalImpact?: string | null;
};

function ImpactRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-[6px] border-b border-border-subtle last:border-0">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[12px] font-semibold text-text-primary">{value.replace(/_/g, ' ')}</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ThreatGeneration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [activeFramework, setActiveFramework] = useState<'stride' | 'heavens'>('stride');

  const { data: threats, isLoading } = useThreats(runId);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-warning-bg flex items-center justify-center mb-[24px]">
          <ShieldAlert className="w-[36px] h-[36px] text-warning-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No threats generated yet</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Run an analysis to generate threat hypotheses from your model.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/explorer')}>
          Go to Model Explorer
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

  const strideThreats = (threats ?? []).filter((t) => t.framework === 'stride');
  const heavensThreats = (threats ?? []).filter((t) => t.framework === 'heavens');
  const hasHeavens = heavensThreats.length > 0;

  const visibleThreats = sortThreats(
    activeFramework === 'stride' ? strideThreats : heavensThreats,
    activeFramework,
  );

  return (
    <div className="flex relative h-[calc(100vh-140px)]">
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedThreat ? 'pr-[380px]' : ''}`}>
        <header className="mb-[24px] flex items-start justify-between gap-[16px] flex-wrap">
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight whitespace-nowrap">Threat Generation</h2>
            <p className="text-[13px] text-text-secondary">
              {visibleThreats.length} {activeFramework.toUpperCase()} threats
              {hasHeavens && activeFramework === 'stride' && ` · ${heavensThreats.length} HEAVENS threats`}
            </p>
          </div>
          <div className="flex items-center gap-[12px] shrink-0">
            {/* STRIDE/HEAVENS toggle — only shown when HEAVENS threats exist */}
            {hasHeavens && (
              <div className="flex items-center bg-surface-2 rounded-[8px] p-[3px] gap-[2px]">
                {(['stride', 'heavens'] as const).map((fw) => (
                  <button
                    key={fw}
                    onClick={() => { setActiveFramework(fw); setSelectedThreat(null); }}
                    className={clsx(
                      'px-[12px] py-[5px] rounded-[6px] text-[12px] font-semibold uppercase transition-colors',
                      activeFramework === fw
                        ? 'bg-white text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary',
                    )}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            )}
            <button className="btn-secondary btn-md">
              <SlidersHorizontal className="w-[14px] h-[14px] mr-[6px]" />
              Strictness: High
            </button>
            <button className="btn-secondary btn-md">
              <Download className="w-[14px] h-[14px] mr-[6px]" />
              Export
            </button>
          </div>
        </header>

        <div className="card-panel p-0 overflow-hidden flex-1 flex flex-col relative">
          <div className="overflow-auto flex-1 h-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-[#f8fafb] z-10 border-b border-border-subtle shadow-[0_1px_0_var(--border-subtle)]">
                <tr className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-[16px] py-[12px] w-[80px]">ID</th>
                  <th className="px-[16px] py-[12px]">Title</th>
                  <th className="px-[16px] py-[12px] w-[180px]">Category</th>
                  <th className="px-[16px] py-[12px] w-[110px]">Severity</th>
                  <th className="px-[16px] py-[12px] w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {visibleThreats.map((threat, index) => (
                  <tr
                    key={threat.id}
                    onClick={() => setSelectedThreat(threat)}
                    className={`h-[44px] hover:bg-[#f9fbfc] cursor-pointer transition-colors ${selectedThreat?.id === threat.id ? 'bg-[#eefbf4] shadow-[inset_3px_0_0_var(--accent-500)]' : ''}`}
                  >
                    <td className="px-[16px] py-[8px] text-[13px] font-medium text-text-secondary font-mono truncate max-w-[80px]">
                      T-{String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="px-[16px] py-[8px] text-[13px] font-semibold text-text-primary max-w-[320px] truncate" title={getThreatTitle(threat)}>
                      {getThreatTitle(threat)}
                    </td>
                    <td className="px-[16px] py-[8px] text-[12px] text-text-secondary">
                      <span className="filter-chip cursor-default bg-surface-1">{threat.category}</span>
                    </td>
                    <td className="px-[16px] py-[8px]">
                      <SeverityBadge severity={threat.severity} />
                    </td>
                    <td className="px-[16px] py-[8px] text-right text-text-disabled">
                      <ChevronRight className="w-[16px] h-[16px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedThreat && (
        <div className="w-[380px] absolute right-0 top-0 bottom-0 bg-white border border-border-subtle rounded-[12px] shadow-md flex flex-col z-20 animate-in slide-in-from-right-8 duration-200">
          <div className="px-[20px] py-[16px] border-b border-border-subtle flex items-center justify-between bg-surface-1 rounded-t-[12px]">
            <div className="flex items-center gap-[10px]">
              <h3 className="text-[14px] font-semibold text-text-primary font-mono">{selectedThreat.id.slice(0, 8)}</h3>
              <SeverityBadge severity={selectedThreat.severity} />
            </div>
            <button onClick={() => setSelectedThreat(null)} className="p-[4px] text-text-muted hover:text-text-primary rounded-[6px] hover:bg-surface-2">
              <X className="w-[16px] h-[16px]" />
            </button>
          </div>

          <div className="p-[20px] flex-1 overflow-y-auto space-y-[20px]">
            <div>
              <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[6px]">Title</h4>
              <p className="text-[14px] font-medium text-text-primary leading-relaxed">{getThreatTitle(selectedThreat)}</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[6px]">Description</h4>
              <p className="text-[13px] text-text-primary leading-relaxed">{selectedThreat.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[4px]">Category</h4>
                <p className="text-[13px] text-text-primary">{selectedThreat.category}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[4px]">Framework</h4>
                <p className="text-[13px] text-text-primary uppercase">{selectedThreat.framework}</p>
              </div>
            </div>

            {/* Impact Breakdown */}
            {selectedThreat.impactBreakdown && (
              <div>
                <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[8px]">Impact Breakdown</h4>
                <div className="bg-surface-1 border border-border-subtle rounded-[8px] px-[12px] divide-y divide-border-subtle">
                  <ImpactRow label="Safety" value={(selectedThreat.impactBreakdown as ImpactBreakdown).safetyImpact} />
                  <ImpactRow label="Financial" value={(selectedThreat.impactBreakdown as ImpactBreakdown).financialImpact} />
                  <ImpactRow label="Operational" value={(selectedThreat.impactBreakdown as ImpactBreakdown).operationalImpact} />
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[6px]">Impacted Assets</h4>
              <div className="flex flex-col gap-[6px]">
                {(selectedThreat.impactedAssets ?? []).map((asset) => (
                  <div key={asset.id} className="text-[13px] px-[10px] py-[8px] bg-surface-1 border border-border-subtle rounded-[8px] font-medium">
                    {asset.name}
                    <span className="ml-[8px] text-[11px] text-text-muted font-normal">{asset.kind}</span>
                  </div>
                ))}
                {(selectedThreat.impactedAssets ?? []).length === 0 && (
                  <p className="text-[13px] text-text-muted">None listed.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-[6px]">Entry Points</h4>
              <div className="flex flex-col gap-[6px]">
                {(selectedThreat.entryPoints ?? []).map((asset) => (
                  <div key={asset.id} className="text-[13px] px-[10px] py-[8px] bg-surface-1 border border-border-subtle rounded-[8px] font-medium">
                    {asset.name}
                    <span className="ml-[8px] text-[11px] text-text-muted font-normal">{asset.kind}</span>
                  </div>
                ))}
                {(selectedThreat.entryPoints ?? []).length === 0 && (
                  <p className="text-[13px] text-text-muted">None listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
