import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Bug, Search, Filter, AlertTriangle, ExternalLink } from 'lucide-react';
import mockCVEs from '../mock-data/cves.json';
import clsx from 'clsx';

export function CVEMatching() {
  const { activeRunId } = useStore();
  const navigate = useNavigate();
  const [selectedCVE, setSelectedCVE] = useState<any>(null);

  if (!activeRunId) {
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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
           <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">CVE Matching</h2>
           <p className="text-[13px] text-text-secondary">Found {mockCVEs.length} vulnerabilities relating to inferred component context.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <div className="relative">
             <Search className="w-[14px] h-[14px] absolute left-[12px] top-[10px] text-text-muted" />
             <input type="text" placeholder="Search by ID or component..." className="input-base pl-[32px] w-[240px]" />
          </div>
          <button className="btn-secondary btn-md">
            <Filter className="w-[14px] h-[14px] mr-[6px]" />
            Filters
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-[20px] min-h-0">
        <div className="flex-1 card-panel flex flex-col p-0 overflow-hidden shadow-sm">
          <div className="bg-surface-1 py-[8px] px-[16px] border-b border-border-subtle flex gap-[8px]">
            <span className="filter-chip-selected filter-chip">All Matches</span>
            <span className="filter-chip hover:bg-surface-2 cursor-pointer">Exact Matches</span>
            <span className="filter-chip hover:bg-surface-2 cursor-pointer">Near Matches</span>
            <span className="filter-chip hover:bg-surface-2 cursor-pointer">High Severity</span>
          </div>

          <div className="flex-1 overflow-y-auto p-[16px] space-y-[12px]">
            {mockCVEs.map(cve => (
              <div 
                key={cve.cve_id} 
                onClick={() => setSelectedCVE(cve)}
                className={clsx(
                  "border border-border-default rounded-[8px] p-[16px] cursor-pointer transition-all hover:-translate-y-px hover:shadow-sm flex gap-[16px]",
                  selectedCVE?.cve_id === cve.cve_id ? "ring-2 ring-accent-500 bg-accent-50/30" : "bg-white"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <h4 className="text-[14px] font-bold text-text-primary font-mono">{cve.cve_id}</h4>
                    {cve.match_tier === 'Exact' ? (
                      <span className="tag-medium bg-success-bg text-success-fg">Exact Match</span>
                    ) : (
                      <span className="tag-medium bg-warning-bg text-warning-fg flex items-center gap-1">
                        {cve.match_tier} Match <AlertTriangle className="w-[12px] h-[12px]" />
                      </span>
                    )}
                    {cve.severity === 'Critical' && <span className="tag-critical">Critical</span>}
                    {cve.severity === 'High' && <span className="tag-high">High</span>}
                    {cve.severity === 'Medium' && <span className="tag-medium">Medium</span>}
                  </div>
                  
                  <div className="flex items-center gap-[16px] text-[13px] text-text-secondary">
                    <span><strong>Component:</strong> {cve.component}</span>
                    <span><strong>Subsystem:</strong> {cve.subsystem}</span>
                  </div>
                  
                  <p className="mt-[12px] text-[13px] text-text-primary leading-relaxed truncate max-w-[80%]">
                    {cve.why_relevant}
                  </p>
                </div>

                <div className="flex flex-col justify-center items-end text-right border-l border-border-subtle pl-[20px] min-w-[100px]">
                  <span className="text-[11px] font-semibold text-text-muted uppercase">CVSS Base</span>
                  <span className={clsx(
                    "text-[24px] font-bold tracking-tight",
                    cve.cvss_base >= 9.0 ? "text-[#b42318]" : 
                    cve.cvss_base >= 7.0 ? "text-[#d14343]" : "text-[#c27a10]"
                  )}>{cve.cvss_base}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedCVE && (
          <div className="w-[400px] card-panel flex flex-col p-0 shadow-sm sticky top-0 overflow-hidden h-full">
            <div className="p-[20px] border-b border-border-subtle bg-surface-1">
              <h3 className="text-[16px] font-bold text-text-primary font-mono mb-[4px]">{selectedCVE.cve_id}</h3>
              <a href="#" className="text-[12px] font-medium text-info-fg hover:underline flex items-center gap-1">
                View in NVD <ExternalLink className="w-[12px] h-[12px]" />
              </a>
            </div>

            <div className="p-[20px] flex-1 overflow-y-auto space-y-[24px]">
              {selectedCVE.match_tier !== 'Exact' && (
                <div className="bg-warning-bg border-l-4 border-warning-fg p-[16px] rounded-r-[8px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <AlertTriangle className="w-[16px] h-[16px] text-warning-fg" />
                    <h4 className="text-[13px] font-bold text-warning-fg uppercase tracking-wide">Contextual Inference</h4>
                  </div>
                  <p className="text-[13px] text-warning-fg leading-relaxed">
                    This CVE is inferred based on subsystem product family matching. The exact software version was unlisted in your ingestion input. Proceed with manual verification.
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Relevance Rationale</h4>
                <p className="text-[13px] text-text-primary leading-[22px] p-[16px] bg-[#f8fafb] border border-border-subtle rounded-[8px]">
                  {selectedCVE.why_relevant}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[12px] font-semibold text-text-muted uppercase">Matching Metrics</h4>
                </div>
                <div className="border border-border-subtle rounded-[8px] divide-y divide-border-subtle">
                  <div className="flex justify-between p-[12px] text-[13px]">
                    <span className="text-text-secondary">Subsystem</span>
                    <span className="font-semibold text-text-primary">{selectedCVE.subsystem}</span>
                  </div>
                  <div className="flex justify-between p-[12px] text-[13px]">
                    <span className="text-text-secondary">Component Match</span>
                    <span className="font-semibold text-text-primary">{selectedCVE.component}</span>
                  </div>
                  <div className="flex justify-between p-[12px] text-[13px]">
                    <span className="text-text-secondary">Publish Date</span>
                    <span className="font-semibold text-text-primary">{selectedCVE.published_date}</span>
                  </div>
                  <div className="flex justify-between p-[12px] text-[13px] bg-surface-1">
                    <span className="text-text-secondary font-medium uppercase">CVSS 3.1</span>
                    <span className={clsx(
                      "font-bold",
                      selectedCVE.cvss_base >= 9.0 ? "text-[#b42318]" : 
                      selectedCVE.cvss_base >= 7.0 ? "text-[#d14343]" : "text-[#c27a10]"
                    )}>{selectedCVE.cvss_base} / 10.0</span>
                  </div>
                </div>
              </div>

              <div className="pt-[16px]">
                <button className="btn-secondary w-full h-[40px]">Create Risk Item for Triage</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
