import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bug, Search, ExternalLink, Loader2 } from 'lucide-react';
import { useCves } from '../hooks/useCves';
import { useSoftwareInstances } from '../hooks/useSoftwareInstances';
import type { CveMatch } from '../types';
import clsx from 'clsx';

type ActiveView = 'recent' | 'dangerous';

function deriveSeverity(cvssScore: number): { label: string; tag: string } {
  if (cvssScore >= 9.0) return { label: 'Critical', tag: 'tag-critical' };
  if (cvssScore >= 7.0) return { label: 'High',     tag: 'tag-high' };
  if (cvssScore >= 4.0) return { label: 'Medium',   tag: 'tag-medium' };
  return                        { label: 'Low',      tag: 'tag-low' };
}

function cvssColour(score: number): string {
  if (score >= 9.0) return 'text-[#b42318]'; // Critical — red
  if (score >= 7.0) return 'text-[#d14343]'; // High — orange-red
  if (score >= 4.0) return 'text-[#c27a10]'; // Medium — amber
  return 'text-[#2e7d32]';                   // Low — green
}

function deriveComputedSeverity(score: number): string {
  if (score >= 90) return 'text-[#b42318]';
  if (score >= 70) return 'text-[#d14343]';
  if (score >= 40) return 'text-[#c27a10]';
  return 'text-[#2e7d32]';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CVEMatching() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const [selectedCVE, setSelectedCVE] = useState<CveMatch | null>(null);
  const [search, setSearch] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('recent');

  const { data: cves, isLoading: cvesLoading } = useCves(runId);
  const { data: instances, isLoading: instancesLoading } = useSoftwareInstances(runId);

  const isLoading = cvesLoading || instancesLoading;

  // Default to first instance when data loads
  const effectiveInstanceId = selectedInstanceId ?? instances?.[0]?.id ?? null;

  // CVEs for the selected instance — computed before early returns so hooks stay unconditional
  const instanceCves = useMemo(
    () => (cves ?? []).filter((c) => c.matchedSoftwareInstance?.id === effectiveInstanceId),
    [cves, effectiveInstanceId]
  );

  // Most Recent: sort by publishedDate desc, top 50, secondary sort by matchScore desc
  const recentCves = useMemo(() =>
    [...instanceCves]
      .sort((a, b) => new Date(b.publishedDate ?? 0).getTime() - new Date(a.publishedDate ?? 0).getTime())
      .slice(0, 50)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)),
    [instanceCves]
  );

  // Most Dangerous: sort by cvssScore desc, top 50, secondary sort by matchScore desc
  const dangerousCves = useMemo(() =>
    [...instanceCves]
      .sort((a, b) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0))
      .slice(0, 50)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)),
    [instanceCves]
  );

  function handleInstanceChange(id: string) {
    setSelectedInstanceId(id);
    setSelectedCVE(null);
    setActiveView('recent');
  }

  function handleViewChange(view: ActiveView) {
    setActiveView(view);
    setSelectedCVE(null);
  }

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-danger-bg flex items-center justify-center mb-[24px]">
          <Bug className="w-[36px] h-[36px] text-danger-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No CVE matching performed</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Generate the model to match against NVD vulnerability databases.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/ingestion')}>
          Go to System Ingestion
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

  const allVisibleCves = activeView === 'recent' ? recentCves : dangerousCves;

  // Search filters within the active view only
  const visibleCves = allVisibleCves.filter((c) =>
    !search ||
    c.cveIdentifier.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedInstance = (instances ?? []).find((i) => i.id === effectiveInstanceId);
  const instanceLabel = selectedInstance
    ? `${selectedInstance.name}${selectedInstance.version ? ` ${selectedInstance.version}` : ''}`
    : '';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">CVE Matching</h2>
          <p className="text-[13px] text-text-secondary">Found {cves?.length ?? 0} vulnerabilities relating to inferred component context.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          {(instances ?? []).length > 0 && (
            <select
              value={effectiveInstanceId ?? ''}
              onChange={(e) => handleInstanceChange(e.target.value)}
              className="input-base w-[220px]"
            >
              {(instances ?? []).map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}{inst.version ? ` ${inst.version}` : ''}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="w-[14px] h-[14px] absolute left-[12px] top-[10px] text-text-muted" />
            <input
              type="text"
              placeholder="Search by ID or description..."
              className="input-base pl-[32px] w-[240px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-[20px] min-h-0">
        {/* CVE list panel */}
        <div className="flex-1 card-panel flex flex-col p-0 overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-[16px]">
            {instanceCves.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-text-muted">
                {instanceLabel ? `No CVEs found for ${instanceLabel} in the last 3 years.` : 'No CVEs found for this component.'}
              </div>
            ) : (
              <>
                {/* Segmented toggle */}
                <div className="flex items-center bg-surface-2 rounded-[8px] p-[3px] gap-[2px] mb-[16px]">
                  {(['recent', 'dangerous'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => handleViewChange(view)}
                      className={clsx(
                        'px-[12px] py-[5px] rounded-[6px] text-[13px] font-medium transition-colors',
                        activeView === view
                          ? 'bg-white text-text-primary shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {view === 'recent' ? 'Most Recent' : 'Most Dangerous'}
                    </button>
                  ))}
                </div>

                {/* Count label */}
                <p className="text-[13px] text-text-secondary mb-[12px]">
                  {visibleCves.length} {activeView === 'recent' ? 'recent' : 'highest severity'} CVEs · sorted by system relevance
                </p>

                {/* CVE cards */}
                <div className="space-y-[12px]">
                  {visibleCves.length > 0 ? visibleCves.map((cve) => (
                    <CveCard
                      key={cve.id}
                      cve={cve}
                      selected={selectedCVE?.id === cve.id}
                      onSelect={setSelectedCVE}
                    />
                  )) : (
                    <div className="flex items-center justify-center h-[120px] text-[13px] text-text-muted">
                      No CVEs in this view for {instanceLabel}.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {selectedCVE && (
          <CveSidebar cve={selectedCVE} />
        )}
      </div>
    </div>
  );
}

// ── CVE Card ─────────────────────────────────────────────────────────────────

interface CveCardProps {
  cve: CveMatch;
  selected: boolean;
  onSelect: (cve: CveMatch) => void;
}

function CveCard({ cve, selected, onSelect }: CveCardProps) {
  const score = cve.cvssScore ?? 0;
  const { label: sevLabel, tag: sevTag } = deriveSeverity(score);
  const computedScore = Math.round((cve.matchScore ?? 0) * 100);
  const swName = cve.matchedSoftwareInstance?.name;

  return (
    <div
      onClick={() => onSelect(cve)}
      className={clsx(
        'border border-border-default rounded-[8px] p-[16px] cursor-pointer transition-all hover:-translate-y-px hover:shadow-sm flex gap-[16px]',
        selected ? 'ring-2 ring-accent-500 bg-accent-50/30' : 'bg-white'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[6px] flex-wrap">
          <h4 className="text-[14px] font-bold text-text-primary font-mono">{cve.cveIdentifier}</h4>
          <span className={sevTag}>{sevLabel}</span>
          <span className="text-[11px] font-semibold text-text-muted">
            Score {computedScore}
          </span>
        </div>
        {swName && (
          <p className="text-[11px] text-text-muted mb-[4px]">{swName}</p>
        )}
        <p className="text-[12px] text-text-secondary">
          {formatDate(cve.publishedDate)}
        </p>
      </div>

      <div className="flex flex-col justify-center items-end text-right border-l border-border-subtle pl-[20px] min-w-[100px]">
        <span className="text-[11px] font-semibold text-text-muted uppercase">CVSS Base</span>
        <span className={clsx('text-[24px] font-bold tracking-tight', cvssColour(score))}>{score}</span>
      </div>
    </div>
  );
}

// ── CVE Sidebar ───────────────────────────────────────────────────────────────

function CveSidebar({ cve }: { cve: CveMatch }) {
  const score = cve.cvssScore ?? 0;
  const { label: cvssLabel } = deriveSeverity(score);
  const computedScore = Math.round((cve.matchScore ?? 0) * 100);
  const swLabel = cve.matchedSoftwareInstance
    ? `${cve.matchedSoftwareInstance.name}${cve.matchedSoftwareInstance.version ? ` ${cve.matchedSoftwareInstance.version}` : ''}`
    : '—';

  return (
    <div className="w-[400px] card-panel flex flex-col p-0 shadow-sm sticky top-0 overflow-hidden h-full">
      {/* Header */}
      <div className="p-[20px] border-b border-border-subtle bg-surface-1">
        <h3 className="text-[16px] font-bold text-text-primary font-mono mb-[4px]">{cve.cveIdentifier}</h3>
        <a
          href={`https://nvd.nist.gov/vuln/detail/${cve.cveIdentifier}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-medium text-info-fg hover:underline flex items-center gap-1"
        >
          View in NVD <ExternalLink className="w-[12px] h-[12px]" />
        </a>
      </div>

      <div className="p-[20px] flex-1 overflow-y-auto space-y-[24px]">
        {/* Description */}
        <div>
          <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Description</h4>
          <p className="text-[13px] text-text-primary leading-[22px] p-[16px] bg-[#f8fafb] border border-border-subtle rounded-[8px]">
            {cve.description ?? '—'}
          </p>
        </div>

        {/* Why Relevant */}
        <div>
          <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Relevance to This System</h4>
          {cve.whyRelevant ? (
            <p className="text-[13px] text-text-primary leading-[22px] p-[16px] bg-[#f8fafb] border border-border-subtle rounded-[8px]">
              {cve.whyRelevant}
            </p>
          ) : (
            <p className="text-[13px] text-text-muted italic p-[16px] bg-[#f8fafb] border border-border-subtle rounded-[8px]">
              Relevance analysis not available for this run.
            </p>
          )}
        </div>

        {/* Scores */}
        <div>
          <div className="grid grid-cols-2 gap-[12px] mb-[16px]">
            <div className="border border-border-subtle rounded-[8px] p-[16px] text-center">
              <p className="text-[11px] font-semibold text-text-muted uppercase mb-[8px]">CVSS Base Score</p>
              <p className={clsx('text-[28px] font-bold tracking-tight', cvssColour(score))}>{score || '—'}</p>
              <p className="text-[12px] text-text-secondary mt-[4px]">{cvssLabel}</p>
            </div>
            <div className="border border-border-subtle rounded-[8px] p-[16px] text-center">
              <p className="text-[11px] font-semibold text-text-muted uppercase mb-[8px]">System Risk Score</p>
              <p className={clsx('text-[28px] font-bold tracking-tight', deriveComputedSeverity(computedScore))}>{computedScore}</p>
              <p className="text-[12px] text-text-secondary mt-[4px]">out of 100</p>
            </div>
          </div>

          {/* Metadata rows */}
          <div className="border border-border-subtle rounded-[8px] divide-y divide-border-subtle">
            <div className="flex justify-between p-[12px] text-[13px]">
              <span className="text-text-secondary">Published</span>
              <span className="font-semibold text-text-primary">{formatDate(cve.publishedDate)}</span>
            </div>
            <div className="flex justify-between p-[12px] text-[13px]">
              <span className="text-text-secondary">Component</span>
              <span className="font-semibold text-text-primary">{swLabel}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="pt-[4px]">
          <button className="btn-secondary w-full h-[40px]">Create Risk Item for Triage</button>
        </div>
      </div>
    </div>
  );
}
