import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Download, Settings, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useRun } from '../hooks/useRun';
import { useExports } from '../hooks/useExports';
import { api, ApiError } from '../lib/api';
import type { Report } from '../types';
import clsx from 'clsx';

const REPORT_SECTIONS = [
  { id: 'context',     label: 'System Context Model (Assets, Boundaries)' },
  { id: 'threats',     label: 'Threat Register' },
  { id: 'cve',         label: 'CVE Matching Audit' },
  { id: 'paths',       label: 'Attack Path Analysis' },
  { id: 'risks',       label: 'Risk Prioritization Scoring Math' },
  { id: 'mitigations', label: 'Mitigation & Action Plan' },
];

type Format = 'PDF' | 'JSON' | 'MD';
const FORMAT_MAP: Record<Format, Report['format']> = { PDF: 'pdf', JSON: 'json', MD: 'md' };

export function ReportsExport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(REPORT_SECTIONS.map(s => s.id))
  );
  const [selectedFormat, setSelectedFormat] = useState<Format>('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data: run } = useRun(runId);
  const { data: exports } = useExports(runId, { poll: isPolling });

  const toggleSection = (id: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <FileText className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No data to export</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Complete the analysis pipeline before exporting.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/mitigations')}>
          Go to Mitigation Planner
        </button>
      </div>
    );
  }

  const runCompleted = run?.status === 'completed';

  const handleGenerate = async () => {
    if (!runId || !runCompleted) return;
    setGenError(null);
    setIsGenerating(true);
    try {
      await api<Report>(`/runs/${runId}/exports`, {
        method: 'POST',
        body: JSON.stringify({ format: FORMAT_MAP[selectedFormat] }),
      });
      setIsPolling(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setGenError(err.message);
      } else {
        setGenError('Failed to start export. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Latest export for display
  const latestExport = exports?.[0];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px]">
        <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Reports & Export</h2>
        <p className="text-[13px] text-text-secondary">Configure and download security validation documentation for Run: <span className="font-mono">{runId?.slice(0, 8)}</span></p>
      </header>

      <div className="flex gap-[20px] min-h-[400px]">
        {/* Configurator */}
        <div className="w-[360px] card-panel h-max">
          <h3 className="text-[16px] font-bold text-text-primary border-b border-border-subtle pb-[12px] mb-[16px] flex items-center justify-between">
            Export Configuration
            <Settings className="w-[14px] h-[14px] text-text-muted" />
          </h3>

          {/* FD6: Removed "(UI only — not yet wired)" label; checkboxes disabled with Coming soon tooltip */}
          <div className="mb-[20px]">
            <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-3">
              Include Sections
            </h4>
            <div className="space-y-[12px]">
              {REPORT_SECTIONS.map(section => (
                <div key={section.id} className="flex items-center gap-[8px] opacity-60">
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={selectedSections.has(section.id)}
                    disabled
                    title="Coming soon"
                    className="h-[16px] w-[16px] shrink-0 rounded-[4px] border-border-default data-[state=checked]:bg-accent-500 data-[state=checked]:border-accent-500 cursor-not-allowed"
                  />
                  <Label
                    htmlFor={`section-${section.id}`}
                    title="Coming soon"
                    className="text-[13px] font-medium text-text-primary leading-tight cursor-not-allowed"
                  >
                    {section.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-[20px] border-t border-border-subtle">
            <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-3">Format</h4>
            <div className="grid grid-cols-3 gap-[8px] mb-[20px]">
              {(['PDF', 'JSON', 'MD'] as Format[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`h-[36px] rounded-[8px] text-[13px] font-semibold transition-all ${
                    selectedFormat === fmt
                      ? 'border-2 border-accent-500 bg-accent-50 text-accent-700'
                      : 'border border-border-default hover:bg-surface-2 text-text-primary'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {!runCompleted && (
              <p className="text-[12px] text-text-muted mb-[10px] flex items-center gap-1">
                <AlertCircle className="w-[12px] h-[12px]" />
                Run must complete before exporting.
              </p>
            )}

            {genError && (
              <p className="text-[13px] text-[#b42318] mb-[10px]">{genError}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!runCompleted || isGenerating}
              className="btn-primary w-full h-[40px] text-[14px] flex items-center justify-center gap-[8px] disabled:opacity-50 disabled:pointer-events-none"
              title={!runCompleted ? 'Run must complete before exporting.' : undefined}
            >
              {isGenerating ? (
                <Loader2 className="w-[16px] h-[16px] animate-spin" />
              ) : (
                <Download className="w-[16px] h-[16px]" fill="currentColor" fillOpacity={0.2} />
              )}
              {isGenerating ? 'Starting Export...' : 'Generate Output'}
            </button>
          </div>
        </div>

        {/* Preview / Status Panel */}
        <div className="flex-1 bg-surface-1 border border-border-default rounded-[12px] p-[32px] overflow-hidden flex flex-col shadow-inner">
          {latestExport ? (
            <div className="flex-1 bg-white shadow-sm border border-border-subtle p-[40px] rounded-[4px] mx-auto w-full max-w-[700px] overflow-y-auto">
              <div className="flex items-center gap-[12px] mb-[24px]">
                {latestExport.status === 'completed' ? (
                  <CheckCircle2 className="w-[20px] h-[20px] text-success-fg" />
                ) : latestExport.status === 'failed' ? (
                  <AlertCircle className="w-[20px] h-[20px] text-[#b42318]" />
                ) : (
                  <Loader2 className="w-[20px] h-[20px] text-accent-500 animate-spin" />
                )}
                <div>
                  <h2 className="text-[18px] font-bold text-text-primary">
                    {latestExport.status === 'completed' ? 'Report Ready' :
                     latestExport.status === 'failed' ? 'Export Failed' :
                     'Generating Report...'}
                  </h2>
                  <p className="text-[13px] text-text-muted">
                    Format: {latestExport.format.toUpperCase()} •
                    Status: <span className="capitalize">{latestExport.status}</span>
                  </p>
                </div>
              </div>

              {latestExport.status === 'failed' && latestExport.errorMessage && (
                <p className="text-[13px] text-[#b42318] mb-[16px]">{latestExport.errorMessage}</p>
              )}

              {latestExport.status === 'completed' && latestExport.downloadUrl && (
                <a
                  href={latestExport.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-md flex items-center justify-center gap-[8px] w-full"
                >
                  <Download className="w-[16px] h-[16px]" />
                  Download Report
                  <ExternalLink className="w-[14px] h-[14px]" />
                </a>
              )}

              {(latestExport.status === 'queued' || latestExport.status === 'running') && (
                <div className="space-y-2 mt-[16px]">
                  <div className="h-[10px] w-full bg-[#f9fafb] rounded animate-pulse"></div>
                  <div className="h-[10px] w-[90%] bg-[#f9fafb] rounded animate-pulse"></div>
                  <div className="h-[10px] w-[95%] bg-[#f9fafb] rounded animate-pulse"></div>
                </div>
              )}

              {/* Previous exports */}
              {exports && exports.length > 1 && (
                <div className="mt-[32px]">
                  <h3 className="text-[13px] font-bold text-text-muted uppercase mb-[12px]">Previous Exports</h3>
                  <div className="space-y-[8px]">
                    {exports.slice(1).map((exp) => (
                      <div key={exp.id} className={clsx("flex items-center justify-between p-[12px] rounded-[8px] border",
                        exp.status === 'completed' ? "border-border-subtle bg-white" : "border-border-default bg-surface-1"
                      )}>
                        <div>
                          <span className="text-[12px] font-semibold text-text-primary">{exp.format.toUpperCase()}</span>
                          <span className="text-[12px] text-text-muted ml-[8px] capitalize">{exp.status}</span>
                        </div>
                        {exp.downloadUrl && (
                          <a href={exp.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent-600 hover:underline flex items-center gap-1">
                            Download <ExternalLink className="w-[10px] h-[10px]" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-white shadow-sm border border-border-subtle p-[40px] rounded-[4px] mx-auto w-full max-w-[700px] overflow-y-auto">
              <h1 className="text-[28px] font-bold text-text-primary mb-[8px]">TARA Security Baseline Report</h1>
              <p className="text-[13px] text-text-muted mb-[32px] border-b border-border-subtle pb-[20px]">Run ID: {runId} • Pending generation</p>
              <div className="space-y-[24px]">
                <div className="h-[20px] w-1/3 bg-[#f2f4f6] rounded"></div>
                <div className="space-y-2">
                  <div className="h-[10px] w-full bg-[#f9fafb] rounded"></div>
                  <div className="h-[10px] w-[90%] bg-[#f9fafb] rounded"></div>
                  <div className="h-[10px] w-[95%] bg-[#f9fafb] rounded"></div>
                </div>
                <div className="h-[120px] w-full bg-[#f9fafb] border border-[#eceff2] rounded mt-4"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
