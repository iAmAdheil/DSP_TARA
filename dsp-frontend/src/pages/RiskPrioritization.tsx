import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart4, ArrowRight } from 'lucide-react';
import { useRisks } from '../hooks/useRisks';
import type { RiskItem } from '../types';
import { Loader2 } from 'lucide-react';

type FilterType = 'all' | 'threat' | 'cve' | 'attack_path';

function getRiskTitle(risk: RiskItem): string {
  if (risk.sourceType === 'threat') {
    return risk.threat?.title || risk.threat?.description.slice(0, 60) || risk.id.slice(0, 8);
  }
  if (risk.sourceType === 'cve') {
    return risk.cveMatch?.cveIdentifier ?? risk.id.slice(0, 8);
  }
  // attack_path
  if (risk.attackPath?.startAsset?.name && risk.attackPath?.targetAsset?.name) {
    return `${risk.attackPath.startAsset.name} → ${risk.attackPath.targetAsset.name}`;
  }
  return 'Attack Path';
}

function getSourceBadgeLabel(sourceType: string): string {
  if (sourceType === 'threat') return 'Threat';
  if (sourceType === 'cve') return 'CVE';
  return 'Attack Path';
}

function getSecondaryLine(risk: RiskItem): string {
  if (risk.sourceType === 'threat' && risk.threat) {
    return `${risk.threat.category} · ${(risk.threat.confidence ?? 0).toFixed(2)} confidence`;
  }
  if (risk.sourceType === 'cve' && risk.cveMatch) {
    const cvss = risk.cveMatch.cvssScore != null ? risk.cveMatch.cvssScore.toFixed(1) : '–';
    return `CVSS ${cvss} · ${risk.cveMatch.matchTier}`;
  }
  if (risk.sourceType === 'attack_path' && risk.attackPath) {
    const crossings = risk.attackPath.trustBoundaryCrossings;
    return crossings > 0 ? `${crossings} boundary crossing(s)` : 'No boundary crossings';
  }
  return '';
}

function getBottomRight(risk: RiskItem): { label: string; value: string } {
  if (risk.sourceType === 'cve') {
    return { label: 'Exploitability', value: risk.exploitability.toFixed(2) };
  }
  if (risk.sourceType === 'attack_path' && risk.attackPath) {
    return { label: 'Feasibility', value: (risk.attackPath.feasibilityScore ?? 0).toFixed(2) };
  }
  return { label: 'Likelihood', value: risk.likelihood.toFixed(2) };
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#b42318', dot: 'bg-[#b42318]' },
  high:     { label: 'High',     color: '#d14343', dot: 'bg-[#d14343]' },
  medium:   { label: 'Medium',   color: '#c27a10', dot: 'bg-[#c27a10]' },
  low:      { label: 'Low',      color: '#2f855a', dot: 'bg-[#2f855a]' },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;

const BORDER_COLOR: Record<Severity, string> = {
  critical: 'border-t-[#b42318]',
  high:     'border-t-[#d14343]',
  medium:   'border-t-[#c27a10]',
  low:      'border-t-[#2f855a]',
};

const FILTER_PILLS: { label: string; value: FilterType }[] = [
  { label: 'All',     value: 'all' },
  { label: 'Threats', value: 'threat' },
  { label: 'CVEs',    value: 'cve' },
  { label: 'Paths',   value: 'attack_path' },
];

interface RiskCardProps {
  risk: RiskItem;
  severity: Severity;
}

function RiskCard({ risk, severity }: RiskCardProps) {
  const title = getRiskTitle(risk);
  const secondary = getSecondaryLine(risk);
  const bottomRight = getBottomRight(risk);
  const borderColor = BORDER_COLOR[severity];

  return (
    <div
      className={`w-[240px] shrink-0 h-[160px] bg-white border border-border-default border-t-4 rounded-[8px] p-[12px] flex flex-col justify-between cursor-pointer hover:shadow-sm transition-shadow ${borderColor}`}
    >
      {/* Top area */}
      <div className="flex flex-col gap-[4px] overflow-hidden">
        <span className="inline-block w-fit text-[10px] font-bold uppercase text-text-muted bg-surface-2 px-[6px] py-[2px] rounded-[4px]">
          {getSourceBadgeLabel(risk.sourceType)}
        </span>
        <h4 className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
          {title}
        </h4>
        {secondary && (
          <p className="text-[11px] text-text-muted truncate">{secondary}</p>
        )}
      </div>

      {/* Bottom meta row */}
      <div className="flex items-end justify-between">
        <div>
          <span className="block text-[10px] uppercase text-text-muted">Score</span>
          <span className="text-[14px] font-bold text-text-primary">{risk.finalScore.toFixed(2)}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] uppercase text-text-muted">{bottomRight.label}</span>
          <span className="text-[11px] text-text-muted">{bottomRight.value}</span>
        </div>
      </div>
    </div>
  );
}

interface SeverityRowProps {
  severity: Severity;
  items: RiskItem[];
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
}

function SeverityRow({ severity, items, filter, onFilterChange }: SeverityRowProps) {
  const cfg = SEVERITY_CONFIG[severity];
  const visible = filter === 'all' ? items : items.filter(r => r.sourceType === filter);

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <span className={`w-[8px] h-[8px] rounded-full ${cfg.dot}`} />
          <span className="text-[13px] font-bold text-text-secondary uppercase">{cfg.label}</span>
          <span
            className="text-[11px] font-bold text-text-muted bg-surface-2 px-[6px] py-[1px] rounded-full"
          >
            {visible.length}
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-[4px]">
          {FILTER_PILLS.map(pill => {
            const isActive = filter === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => onFilterChange(pill.value)}
                className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full transition-colors"
                style={
                  isActive
                    ? { backgroundColor: cfg.color, color: '#ffffff' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                }
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex flex-row gap-[12px] overflow-x-auto pb-[8px]">
        {visible.length === 0 ? (
          <div className="h-[160px] min-w-[200px] border-2 border-dashed border-border-default rounded-[8px] flex items-center justify-center">
            <span className="text-[12px] font-medium text-text-disabled uppercase">Queue Empty</span>
          </div>
        ) : (
          visible.map(risk => (
            <RiskCard key={risk.id} risk={risk} severity={severity} />
          ))
        )}
      </div>
    </div>
  );
}

export function RiskPrioritization() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const { data: risks, isLoading } = useRisks(runId);

  const [filters, setFilters] = useState<Record<Severity, FilterType>>({
    critical: 'all',
    high:     'all',
    medium:   'all',
    low:      'all',
  });

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-warning-bg flex items-center justify-center mb-[24px]">
          <BarChart4 className="w-[36px] h-[36px] text-warning-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No Risk Scoring performed</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Generate attack paths to compute risk prioritization.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/paths')}>
          Go to Attack Paths
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

  const allRisks = risks ?? [];
  const buckets: Record<Severity, RiskItem[]> = {
    critical: allRisks.filter(r => r.severity === 'critical'),
    high:     allRisks.filter(r => r.severity === 'high'),
    medium:   allRisks.filter(r => r.severity === 'medium'),
    low:      allRisks.filter(r => r.severity === 'low' || r.severity === 'info'),
  };

  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="flex flex-col gap-[24px]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Risk Prioritization Queue</h2>
          <p className="text-[13px] text-text-secondary">Calculated based on Impact × Exploitability × Likelihood equations.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button className="btn-secondary btn-md">Recompute Risks</button>
          <button
            className="btn-primary btn-md flex items-center gap-2"
            onClick={() => navigate(`/mitigations?runId=${runId}`)}
          >
            Proceed to Mitigation <ArrowRight className="w-[14px] h-[14px]" />
          </button>
        </div>
      </header>

      {severities.map(severity => (
        <SeverityRow
          key={severity}
          severity={severity}
          items={buckets[severity]}
          filter={filters[severity]}
          onFilterChange={f => setFilters(prev => ({ ...prev, [severity]: f }))}
        />
      ))}
    </div>
  );
}
