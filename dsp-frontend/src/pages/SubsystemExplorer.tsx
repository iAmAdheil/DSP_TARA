import { useStore } from '../store';
import { Box, Layers, Filter } from 'lucide-react';
import clsx from 'clsx';

export function SubsystemExplorer() {
  const { activeRunId } = useStore();

  if (!activeRunId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Box className="w-[48px] h-[48px] text-text-muted mb-[16px]" />
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No Subsystem mapping available</h2>
      </div>
    );
  }

  const subsystems = [
    { name: 'Infotainment', risks: 12, heat: 'High' },
    { name: 'Telematics', risks: 8, heat: 'Medium' },
    { name: 'ADAS', risks: 4, heat: 'Critical' },
    { name: 'Powertrain', risks: 0, heat: 'Low' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
           <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Subsystem Explorer</h2>
           <p className="text-[13px] text-text-secondary">2D macro-view of the vehicle architecture mapping to isolation boundaries.</p>
        </div>
        <div className="flex items-center gap-[12px]">
           <button className="btn-secondary btn-md">
             <Layers className="w-[14px] h-[14px] mr-[6px]"/>
             Toggle 3D View (Alpha)
           </button>
           <button className="btn-secondary btn-md">
             <Filter className="w-[14px] h-[14px] mr-[6px]"/>
             Risk Heat Overlay
           </button>
        </div>
      </header>
      
      <div className="flex-1 card-panel flex border border-border-default shadow-sm relative overflow-hidden bg-[#f4f6f8]">
        {/* Mock representation of the 2D car plane */}
        <div className="absolute inset-[32px] border-4 border-[#dce2e8] rounded-[24px] grid grid-cols-2 grid-rows-2 gap-[16px] p-[16px]">
           {subsystems.map((sub, i) => (
             <div 
               key={i} 
               className={clsx(
                 "border-2 border-transparent rounded-[12px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#1b7f55] group relative overflow-hidden",
                 sub.heat === 'Critical' ? "bg-[rgba(180,35,24,0.1)] border-[rgba(180,35,24,0.2)] hover:border-[rgba(180,35,24,0.72)]" :
                 sub.heat === 'High' ? "bg-[rgba(209,67,67,0.1)] border-[rgba(209,67,67,0.2)] hover:border-[rgba(209,67,67,0.64)]" :
                 sub.heat === 'Medium' ? "bg-[rgba(194,122,16,0.1)] border-[rgba(194,122,16,0.2)] hover:border-[rgba(194,122,16,0.56)]" :
                 "bg-[rgba(47,133,90,0.1)] border-[rgba(47,133,90,0.2)] hover:border-[rgba(47,133,90,0.52)]"
               )}
             >
                <h3 className="text-[18px] font-bold text-text-primary z-10">{sub.name}</h3>
                <span className="text-[12px] font-semibold text-text-secondary z-10">{sub.risks} Associated Risks</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
