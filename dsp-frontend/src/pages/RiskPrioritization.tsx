import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { BarChart4, ArrowRight, Activity, TrendingDown } from 'lucide-react';
import mockRisks from '../mock-data/risks.json';

export function RiskPrioritization() {
  const { activeRunId } = useStore();
  const navigate = useNavigate();

  if (!activeRunId) {
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

  // Create queue columns based on severity
  const critical = mockRisks.filter(r => r.severity === 'Critical');
  const high = mockRisks.filter(r => r.severity === 'High');
  const medium = mockRisks.filter(r => r.severity === 'Medium');
  const low = mockRisks.filter(r => r.severity === 'Low');

  const queues = [
    { title: 'Critical priority', data: critical, color: 'border-t-[#b42318]' },
    { title: 'High priority', data: high, color: 'border-t-[#d14343]' },
    { title: 'Medium priority', data: medium, color: 'border-t-[#c27a10]' },
    { title: 'Low priority', data: low, color: 'border-t-[#2f855a]' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
           <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Risk Prioritization Queue</h2>
           <p className="text-[13px] text-text-secondary">Calculated based on Impact × Exploitability × Likelihood equations.</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button className="btn-secondary btn-md">Recompute Risks</button>
          <button className="btn-primary btn-md flex items-center gap-2">
            Proceed to Mitigation <ArrowRight className="w-[14px] h-[14px]" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-[20px] flex-1 min-h-0 overflow-y-hidden">
        {queues.map((q, idx) => (
          <div key={idx} className="flex flex-col h-full">
             <div className="flex items-center justify-between mb-[12px] px-[4px]">
               <h3 className="text-[13px] font-bold text-text-secondary uppercase">{q.title}</h3>
               <span className="w-[20px] h-[20px] rounded bg-surface-2 flex items-center justify-center text-[11px] font-bold text-text-muted">{q.data.length}</span>
             </div>
             <div className="flex-1 bg-surface-1 rounded-[12px] p-[12px] overflow-y-auto space-y-[12px] border border-border-subtle shadow-inner">
               {q.data.map(risk => (
                 <div key={risk.risk_id} className={`bg-white border-t-4 border-l border-r border-b border-border-default rounded-[8px] p-[16px] shadow-xs hover:shadow-sm cursor-pointer transition-all ${q.color}`}>
                   <div className="flex justify-between items-start mb-[12px]">
                     <span className="text-[11px] font-bold text-text-muted font-mono">{risk.risk_id}</span>
                     <span className="text-[14px] font-bold text-text-primary">{risk.risk_score}</span>
                   </div>
                   <h4 className="text-[13px] font-semibold leading-tight text-text-primary mb-[16px]">{risk.title}</h4>
                   
                   <div className="grid grid-cols-2 gap-[8px]">
                     <div className="bg-[#f8fafb] rounded-[6px] p-[8px]">
                       <span className="block text-[10px] uppercase font-semibold text-text-muted mb-1">Safety Impact</span>
                       <span className={`text-[12px] font-bold ${
                         risk.safety_impact === 'High' ? 'text-[#b42318]' : 
                         risk.safety_impact === 'Medium' ? 'text-[#c27a10]' : 'text-text-primary'
                       }`}>{risk.safety_impact}</span>
                     </div>
                     <div className="bg-[#f8fafb] rounded-[6px] p-[8px]">
                       <span className="block text-[10px] uppercase font-semibold text-text-muted mb-1">Exploitability</span>
                       <span className="text-[12px] font-bold text-text-primary">{risk.exploitability}</span>
                     </div>
                   </div>

                   <hr className="my-[12px] border-border-subtle" />
                   
                   <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium uppercase">
                     <span className="flex items-center gap-1"><Activity className="w-[12px] h-[12px]" /> {risk.source_type}</span>
                     <span className="flex items-center gap-1"><TrendingDown className="w-[12px] h-[12px]" /> Effort: {risk.effort}</span>
                   </div>
                 </div>
               ))}

               {q.data.length === 0 && (
                 <div className="h-[100px] border-2 border-dashed border-border-default rounded-[8px] flex items-center justify-center">
                   <span className="text-[12px] font-medium text-text-disabled uppercase">Queue Empty</span>
                 </div>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
