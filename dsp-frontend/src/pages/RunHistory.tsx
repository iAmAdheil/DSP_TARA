import { useStore } from '../store';
import { FileJson, DatabaseBackup, GitCompare } from 'lucide-react';
import mockRuns from '../mock-data/runs.json';

export function RunHistory() {
  const { activeRunId } = useStore();

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px]">
        <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Run History</h2>
        <p className="text-[13px] text-text-secondary">Explore historically generated snapshots, baselines and configuration setups.</p>
      </header>

      <div className="card-panel overflow-hidden p-0">
        <div className="bg-surface-1 py-[12px] px-[20px] border-b border-border-default flex items-center justify-between">
           <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider">Analysis Execution Log</h3>
           <button className="btn-secondary btn-sm"><DatabaseBackup className="w-[12px] h-[12px] mr-2"/> Re-index Local Cache</button>
        </div>
        
        <table className="w-full text-left">
           <thead className="bg-[#fcfcfd] border-b border-border-subtle">
             <tr className="text-[12px] text-text-muted uppercase font-semibold tracking-wider">
               <th className="px-[20px] py-[12px]">Run ID</th>
               <th className="px-[20px] py-[12px]">Status</th>
               <th className="px-[20px] py-[12px]">Date Executed</th>
               <th className="px-[20px] py-[12px]">Model Version</th>
               <th className="px-[20px] py-[12px] text-right">Extracted Assets</th>
               <th className="px-[20px] py-[12px] text-right">Threats</th>
               <th className="px-[20px] py-[12px] text-center">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-border-subtle">
             {mockRuns.map((r, i) => (
               <tr key={i} className={`hover:bg-surface-1 transition-colors ${activeRunId === r.run_id ? 'bg-[#eaf5ef]' : ''}`}>
                 <td className="px-[20px] py-[14px]">
                    <div className="flex items-center gap-2">
                       <span className="text-[13px] font-mono font-bold text-text-secondary">{r.run_id}</span>
                       {activeRunId === r.run_id && <span className="bg-accent-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">Active</span>}
                    </div>
                 </td>
                 <td className="px-[20px] py-[14px]">
                   {r.status === 'completed' ? (
                     <span className="tag-low bg-success-bg text-success-fg">Completed</span>
                   ) : (
                     <span className="tag-high bg-danger-bg text-danger-fg">Failed</span>
                   )}
                 </td>
                 <td className="px-[20px] py-[14px] text-[13px] text-text-primary">{r.timestamp}</td>
                 <td className="px-[20px] py-[14px] text-[13px] font-mono text-text-secondary">{r.model_version}</td>
                 <td className="px-[20px] py-[14px] text-[14px] font-semibold text-right text-text-primary">{r.assets_analyzed}</td>
                 <td className="px-[20px] py-[14px] text-[14px] font-semibold text-right text-text-primary">{r.threats_generated}</td>
                 <td className="px-[20px] py-[14px]">
                     <div className="flex items-center justify-center gap-[8px]">
                       <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded border border-transparent hover:border-border-default transition-all" title="View JSON Snapshot"><FileJson className="w-[14px] h-[14px]" /></button>
                       {r.status === 'completed' && <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-2 rounded border border-transparent hover:border-border-default transition-all" title="Diff Against Active"><GitCompare className="w-[14px] h-[14px]" /></button>}
                       {activeRunId !== r.run_id && r.status==='completed' && (
                         <button className="btn-secondary btn-sm ml-2" onClick={() => {}}>
                           Restore
                         </button>
                       )}
                     </div>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
}
