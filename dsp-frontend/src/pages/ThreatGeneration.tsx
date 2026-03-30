import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ShieldAlert, Download, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import mockThreats from '../mock-data/threats.json';

export function ThreatGeneration() {
  const { activeRunId } = useStore();
  const navigate = useNavigate();
  const [selectedThreat, setSelectedThreat] = useState<any>(null);

  if (!activeRunId) {
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

  return (
    <div className="flex relative h-[calc(100vh-140px)]">
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedThreat ? 'pr-[360px]' : ''}`}>
        <header className="mb-[24px] flex items-center justify-between">
          <div>
             <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Threat Generation</h2>
             <p className="text-[13px] text-text-secondary">Review {mockThreats.length} generated hypothesis using STRIDE/HEAVENS methodology.</p>
          </div>
          <div className="flex items-center gap-[12px]">
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
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-[#f8fafb] z-10 border-b border-border-subtle shadow-[0_1px_0_var(--border-subtle)]">
                <tr className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-[16px] py-[12px] w-[80px]">ID</th>
                  <th className="px-[16px] py-[12px] w-[35%]">Title</th>
                  <th className="px-[16px] py-[12px]">Category</th>
                  <th className="px-[16px] py-[12px] text-center">Safety Impact</th>
                  <th className="px-[16px] py-[12px] text-center">Confidence</th>
                  <th className="px-[16px] py-[12px] text-center">Status</th>
                  <th className="px-[16px] py-[12px] w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {mockThreats.map((threat) => (
                  <tr 
                    key={threat.threat_id} 
                    onClick={() => setSelectedThreat(threat)}
                    className={`h-[44px] hover:bg-[#f9fbfc] cursor-pointer transition-colors ${selectedThreat?.threat_id === threat.threat_id ? 'bg-[#eefbf4] shadow-[inset_3px_0_0_var(--accent-500)]' : ''}`}
                  >
                    <td className="px-[16px] py-[8px] text-[13px] font-medium text-text-secondary font-mono">{threat.threat_id}</td>
                    <td className="px-[16px] py-[8px] text-[13px] font-semibold text-text-primary max-w-[280px] truncate" title={threat.title}>{threat.title}</td>
                    <td className="px-[16px] py-[8px] text-[12px] text-text-secondary">
                      <span className="filter-chip cursor-default bg-surface-1">{threat.category}</span>
                    </td>
                    <td className="px-[16px] py-[8px] text-center">
                      {threat.safety_impact === 'Critical' && <span className="tag-critical">Critical</span>}
                      {threat.safety_impact === 'High' && <span className="tag-high">High</span>}
                      {threat.safety_impact === 'Medium' && <span className="tag-medium">Medium</span>}
                      {threat.safety_impact === 'Low' && <span className="tag-low">Low</span>}
                    </td>
                    <td className="px-[16px] py-[8px] text-center text-[13px] text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-[40px] h-[6px] bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-500" style={{ width: `${threat.confidence * 100}%` }}></div>
                        </div>
                        <span className="w-[30px] text-right">{(threat.confidence*100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-[16px] py-[8px] text-center">
                      <span className="text-[12px] font-medium text-text-secondary capitalize">{threat.status}</span>
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

      {/* Drawer */}
      {selectedThreat && (
        <div className="w-[360px] absolute right-0 top-0 bottom-0 bg-white border border-border-subtle rounded-[12px] shadow-md flex flex-col z-20 animate-in slide-in-from-right-8 duration-200">
          <div className="px-[20px] py-[16px] border-b border-border-subtle flex items-center justify-between bg-surface-1 rounded-t-[12px]">
            <h3 className="text-[14px] font-semibold text-text-primary font-mono">{selectedThreat.threat_id} Details</h3>
            <button onClick={() => setSelectedThreat(null)} className="p-[4px] text-text-muted hover:text-text-primary rounded-[6px] hover:bg-surface-2">
              <X className="w-[16px] h-[16px]" />
            </button>
          </div>
          <div className="p-[20px] flex-1 overflow-y-auto space-y-[24px]">
            <div>
              <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Title</h4>
              <p className="text-[14px] font-medium text-text-primary leading-relaxed">{selectedThreat.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-1">Category</h4>
                <p className="text-[13px] text-text-primary">{selectedThreat.category}</p>
              </div>
              <div>
                <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-1">Confidence</h4>
                <p className="text-[13px] text-text-primary font-mono">{selectedThreat.confidence}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Impacted Assets</h4>
              <div className="flex flex-col gap-2">
                {selectedThreat.impacted_assets.map((asset: string, i: number) => (
                  <div key={i} className="text-[13px] p-[10px] bg-surface-1 border border-border-subtle rounded-[8px] font-medium">{asset}</div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold text-text-muted uppercase mb-2">Entry Points</h4>
              <ul className="list-disc pl-[20px] text-[13px] text-text-primary space-y-1">
                {selectedThreat.entry_points.map((ep: string, i: number) => (
                  <li key={i}>{ep}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-[20px] border-t border-border-subtle bg-[#fcfcfd] rounded-b-[12px] flex gap-2">
            <button className="btn-primary w-full h-[36px]">Mark as Valid</button>
            <button className="btn-secondary w-full h-[36px]">Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}
