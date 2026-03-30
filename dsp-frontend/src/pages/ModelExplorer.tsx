import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Network, Search, ArrowRight, MousePointerClick } from 'lucide-react';
import mockModel from '../mock-data/model.json';
import clsx from 'clsx';

export function ModelExplorer() {
  const { activeRunId } = useStore();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  if (!activeRunId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-info-bg flex items-center justify-center mb-[24px]">
          <Network className="w-[36px] h-[36px] text-info-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No model generated yet</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Go to System Ingestion to build the system boundaries.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/ingestion')}>
          Go to System Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-[20px] h-[calc(100vh-140px)] w-full">
      <div className="flex-1 flex flex-col min-w-0 pr-[10px] w-full">
        <header className="mb-[24px] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Canonical Model Explorer</h2>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Explore the graph representation of the ingested system diagram.
            </p>
          </div>
        </header>
        
        <div className="flex-1 border border-border-default rounded-[12px] bg-surface-1 shadow-inner relative overflow-hidden flex items-center justify-center">
            {/* Fake canvas representation */}
            <div className="absolute top-[20px] left-[20px] bg-white border border-border-subtle p-2 rounded-[8px] flex items-center gap-[8px] z-10 shadow-sm">
               <Search className="w-[14px] h-[14px] text-text-muted" />
               <input type="text" placeholder="Filter nodes..." className="text-[12px] border-none outline-none w-[120px]" />
            </div>

            <div className="flex gap-[60px] relative items-center z-0">
               {/* Drawing simple lines */}
               <div className="absolute top-1/2 left-[120px] right-[120px] h-[2px] bg-border-strong -translate-y-1/2 z-0 opacity-50"></div>
               <div className="absolute top-[30px] bottom-[30px] left-1/2 w-[2px] bg-border-strong -translate-x-1/2 z-0 opacity-50"></div>
               
               {/* Drawing simple nodes */}
               {mockModel.map((node, i) => (
                 <div
                   key={node.id}
                   onClick={() => setSelectedNode(node)}
                   className={clsx(
                     "relative z-10 w-[140px] p-[16px] bg-white border rounded-[12px] shadow-sm cursor-pointer transition-all hover:-translate-y-[2px] hover:shadow-md",
                     selectedNode?.id === node.id ? "border-accent-500 ring-[3px] ring-accent-500/20" : "border-border-default hover:border-border-strong"
                   )}
                   style={{ transform: i === 1 ? 'translateY(-60px)' : i === 2 ? 'translateY(60px)' : '' }}
                 >
                   <div className="w-[24px] h-[24px] rounded-full bg-[#f3f6f8] flex items-center justify-center text-[10px] font-bold mb-2 mx-auto">
                     {node.id}
                   </div>
                   <h4 className="text-[12px] font-semibold text-center leading-tight">{node.label}</h4>
                 </div>
               ))}
            </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-[360px] shrink-0 bg-surface-0 border border-border-subtle rounded-[12px] shadow-sm flex flex-col h-full sticky top-[20px] overflow-hidden">
        {selectedNode ? (
          <>
            <div className="p-[16px] border-b border-border-default bg-surface-1">
               <div className="flex items-center gap-2 mb-2 text-text-muted font-mono text-[11px]">
                  <span>{selectedNode.id}</span>
                  <ArrowRight className="w-[10px] h-[10px]" />
                  <span className="uppercase">{selectedNode.type}</span>
               </div>
               <h3 className="text-[16px] font-bold text-text-primary">
                 {selectedNode.label}
               </h3>
               <span className="filter-chip mt-2 bg-white border-border-subtle">{selectedNode.subsystem} Subsystem</span>
            </div>
            <div className="p-[16px] flex-1 overflow-y-auto space-y-[20px]">
               <div>
                  <h4 className="text-[11px] font-semibold uppercase text-text-muted mb-2">Properties</h4>
                  <div className="bg-[#f8fafb] border border-border-subtle rounded-[8px] text-[13px] divide-y divide-border-subtle">
                     <div className="flex justify-between p-[10px]">
                       <span className="text-text-secondary">OS Concept</span>
                       <span className="font-semibold">{selectedNode.metadata?.os || 'Unknown'}</span>
                     </div>
                  </div>
               </div>
               
               <div>
                  <h4 className="text-[11px] font-semibold uppercase text-text-muted mb-2">Attached Interfaces</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.metadata?.interfaces?.map((inf: string) => (
                      <span key={inf} className="text-[12px] px-2 py-1 bg-surface-1 border border-border-default rounded-[6px] font-medium text-text-primary">
                        {inf}
                      </span>
                    )) || <span className="text-[12px] text-text-muted">No external interfaces specified.</span>}
                  </div>
               </div>
               
               <div>
                  <h4 className="text-[11px] font-semibold uppercase text-text-muted mb-2">Linked Evidence References</h4>
                  <div className="text-[12px] text-info-fg cursor-pointer hover:underline space-y-1">
                    <p>Document 1 (User manual extracts)</p>
                    <p>Document 3 (Architecture visio reference.pdf)</p>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-[20px] text-center h-full">
            <MousePointerClick className="w-[48px] h-[48px] text-text-disabled mb-[16px]" />
            <h4 className="text-[14px] font-semibold text-text-primary mb-[4px]">Select a Node</h4>
            <p className="text-[12px] text-text-muted">Click an entity on the canvas to inspect its details and relations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
