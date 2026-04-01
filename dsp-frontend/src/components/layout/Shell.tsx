import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Check } from 'lucide-react';
import clsx from 'clsx';

const PIPELINE_STEPS = [
  { id: '/ingestion', label: 'Ingest' },
  { id: '/explorer', label: 'Explore' },
  { id: '/threats', label: 'Threats' },
  { id: '/cve', label: 'CVE Matching' },
  { id: '/paths', label: 'Attack Paths' },
  { id: '/risks', label: 'Risk Scoring' },
  { id: '/mitigations', label: 'Mitigate' },
];

function PipelineProgress() {
  const location = useLocation();
  const currentIndex = PIPELINE_STEPS.findIndex(s => location.pathname.startsWith(s.id));
  
  if (currentIndex === -1) return null; 

  return (
    <div className="bg-surface-0 border-b border-border-subtle px-[20px] py-[10px] flex justify-center shadow-xs z-10">
      <div className="flex items-center gap-[8px] overflow-x-auto no-scrollbar">
        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          return (
            <div key={step.id} className="flex items-center gap-[8px] shrink-0">
              <span className={clsx(
                "text-[11px] font-semibold tracking-wide uppercase transition-colors flex items-center gap-1.5",
                isActive ? "text-accent-600" : isCompleted ? "text-text-primary" : "text-text-disabled"
              )}>
                <div className={clsx(
                  "w-[16px] h-[16px] rounded-full flex justify-center items-center border shrink-0",
                  isActive ? "bg-accent-500 text-white border-accent-500" :
                  isCompleted ? "bg-accent-500 text-white border-accent-500" :
                  "bg-transparent border-border-strong text-text-disabled"
                )}>
                  {isCompleted
                    ? <Check className="w-[9px] h-[9px]" strokeWidth={3} />
                    : <span className="text-[9px] font-bold">{idx + 1}</span>
                  }
                </div>
                {step.label}
              </span>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={clsx("w-[16px] h-px mx-1", idx < currentIndex ? "bg-accent-500" : "bg-border-strong")} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Shell() {
  return (
    <div className="flex h-screen w-full bg-app overflow-hidden text-text-primary font-sans max-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav />
        <PipelineProgress />
        <main className="flex-1 overflow-y-auto p-[20px] pb-[40px]">
          <div className="max-w-[1400px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
