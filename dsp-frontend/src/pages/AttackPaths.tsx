import { useState } from 'react';
import { useStore } from '../store';
import { Route, Search, ShieldAlert, ArrowRightCircle } from 'lucide-react';
import mockPaths from '../mock-data/paths.json';
import clsx from 'clsx';

export function AttackPaths() {
  const { activeRunId } = useStore();
  const [selectedPath, setSelectedPath] = useState<any>(null);

  if (!activeRunId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Route className="w-[48px] h-[48px] text-text-muted mb-[16px]" />
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No valid attack paths found</h2>
        <p className="text-[13px] text-text-secondary">Please generate model and threats first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
         <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Attack Paths Builder</h2>
            <p className="text-[13px] text-text-secondary">Explore {mockPaths.length} multi-step paths leading to target assets.</p>
         </div>
      </header>

      <div className="flex flex-1 gap-[20px] min-h-0">
        <div className="w-[400px] shrink-0 card-panel flex flex-col p-0 shadow-sm overflow-hidden">
          <div className="p-[16px] bg-surface-1 border-b border-border-default">
             <div className="relative mb-[12px]">
               <Search className="w-[14px] h-[14px] absolute left-[12px] top-[10px] text-text-muted" />
               <input type="text" placeholder="Search targets or surfaces..." className="input-base w-full pl-[32px] h-[32px] text-[12px]" />
             </div>
             <p className="text-[11px] font-bold uppercase text-text-muted tracking-tight">Ranked Paths by Risk Level</p>
          </div>
          <div className="flex-1 overflow-y-auto p-[12px] space-y-[12px] bg-surface-0">
             {mockPaths.map(path => (
               <div
                 key={path.path_id}
                 onClick={() => setSelectedPath(path)}
                 className={clsx(
                   "p-[16px] border rounded-[8px] cursor-pointer hover:-translate-y-px transition-all bg-white",
                   selectedPath?.path_id === path.path_id ? "border-accent-500 shadow-[inset_4px_0_0_0_var(--accent-500)]" : "border-border-default hover:border-border-strong hover:shadow-xs"
                 )}
               >
                 <div className="flex justify-between items-start mb-[8px]">
                   <span className="text-[12px] font-bold text-text-secondary font-mono">{path.path_id}</span>
                   {path.overall_path_risk === 'Critical' ? (
                     <span className="tag-critical text-[10px] px-1">Critical</span>
                   ) : (
                     <span className="tag-high text-[10px] px-1">High</span>
                   )}
                 </div>
                 <div className="flex items-center gap-[8px] text-[13px]">
                   <span className="font-semibold truncate max-w-[120px]">{path.start_surface}</span>
                   <ArrowRightCircle className="w-[14px] h-[14px] text-text-muted shrink-0" />
                   <span className="font-semibold truncate max-w-[120px]">{path.target_asset}</span>
                 </div>
                 <div className="mt-[12px] flex items-center justify-between text-[11px] text-text-muted">
                    <span>{path.steps.length} Steps</span>
                    <span>Fr: {path.feasibility_score} • Im: {path.impact_score}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Right side Path Visualizer */}
        <div className="flex-1 card-panel flex flex-col p-0 overflow-hidden shadow-sm bg-[#f8fafb]">
          {selectedPath ? (
            <div className="flex-1 overflow-y-auto p-[32px] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
               <h3 className="text-[18px] font-bold text-text-primary mb-[32px]">{selectedPath.path_id} Sequence</h3>
               
               <div className="flex-1 relative max-w-[600px] mx-auto w-full border-l-2 border-dashed border-border-strong ml-[20px] pl-[32px] pb-[40px] space-y-[40px]">
                  
                  {/* Start Point */}
                  <div className="relative">
                    <div className="absolute -left-[45px] top-1/2 -translate-y-1/2 w-[24px] h-[24px] bg-white border-[3px] border-border-strong rounded-full z-10"></div>
                    <div className="bg-surface-2 border border-border-default rounded-[8px] p-[16px]">
                       <span className="block text-[11px] uppercase font-semibold text-text-muted mb-1">Entry Surface</span>
                       <span className="text-[14px] font-bold">{selectedPath.start_surface}</span>
                    </div>
                  </div>

                  {/* Steps */}
                  {selectedPath.steps.map((step: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[42px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] bg-accent-100 border-2 border-accent-500 rounded-full z-10 flex items-center justify-center text-[10px] font-bold text-accent-700">{step.step}</div>
                      <div className="bg-white border hover:border-accent-300 border-border-default rounded-[10px] p-[16px] shadow-sm transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start">
                          <p className="text-[13px] text-text-primary leading-relaxed font-medium group-hover:text-accent-700">{step.description}</p>
                          <ShieldAlert className="w-[14px] h-[14px] text-text-muted mt-1 opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                      
                      {/* Trivial simulated linked CVE for visual depth if it's step 2 */}
                      {idx === 1 && (
                         <div className="mt-2 ml-4 flex items-center gap-2">
                            <div className="w-[20px] border-b border-border-subtle" />
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-warning-bg text-warning-fg border border-warning-fg border-opacity-20 cursor-pointer">CVE-2022-38392</span>
                         </div>
                      )}
                    </div>
                  ))}

                  {/* End Point */}
                  <div className="relative">
                    <div className="absolute -left-[45px] top-1/2 -translate-y-1/2 w-[24px] h-[24px] bg-[#fff1f2] border-[3px] border-[#b42318] rounded-full z-10 flex border-dashed"></div>
                    <div className="bg-[#fff1f2] border border-[#cfd6de] rounded-[8px] p-[16px]">
                       <span className="block text-[11px] uppercase font-semibold text-[#912018] mb-1">Impact Asset</span>
                       <span className="text-[14px] font-bold text-[#b42318]">{selectedPath.target_asset}</span>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Route className="w-[48px] h-[48px] text-text-disabled mb-[16px]" />
              <h4 className="text-[16px] font-semibold text-text-primary mb-[4px]">Select highly probable attack path</h4>
              <p className="text-[13px] text-text-muted max-w-[280px]">View the detailed step-by-step traversal from exterior interface to secured asset.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
