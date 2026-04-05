import { useState } from 'react';
import { FileText, ListTree, UploadCloud, Play, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api, ApiError } from '../lib/api';
import type { Run } from '../types';

export function SystemIngestion() {
  const [activeTab, setActiveTab] = useState<'text' | 'form' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeProjectId, setActiveRunId, addOpenRunId, setProjectModalOpen } = useStore();
  const navigate = useNavigate();

  const handleStartAnalysis = async () => {
    if (!activeProjectId || !textInput.trim()) return;
    setError(null);
    setIsProcessing(true);
    try {
      const run = await api<Run>(`/projects/${activeProjectId}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          artifacts: [{ type: 'text', content: textInput.trim() }],
        }),
      });
      addOpenRunId(run.id);
      setActiveRunId(run.id);
      navigate(`/?runId=${run.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to start analysis. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full">
      <header className="mb-[24px]">
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px] tracking-tight">System Input & Extraction</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Describe your system architecture, components, and boundaries to start an analysis run.
        </p>
      </header>

      {/* No project selected prompt */}
      {!activeProjectId && (
        <div className="mb-[20px] p-[14px] rounded-[10px] bg-warning-bg border border-warning-fg/20 flex items-center gap-[12px]">
          <FolderOpen className="w-[16px] h-[16px] text-warning-fg shrink-0" />
          <p className="text-[13px] text-warning-fg font-medium flex-1">
            No project selected. Select or create a project to start an analysis.
          </p>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="btn-secondary btn-sm text-[12px] shrink-0"
          >
            New Project
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-[8px] border-b border-border-default mb-[20px]">
        {[
          { id: 'text', label: 'Unstructured Text', icon: FileText },
          { id: 'form', label: 'Structured Form', icon: ListTree },
          { id: 'file', label: 'File Upload', icon: UploadCloud },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "h-[32px] px-[12px] flex items-center gap-2 text-[13px] font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-accent-500 text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            <tab.icon className="w-[14px] h-[14px]" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Text Input */}
      {activeTab === 'text' && (
        <div className="flex flex-col flex-1 h-full min-h-[300px]">
          <div className="card-panel flex flex-col flex-1 p-0 overflow-hidden shadow-sm hover:translate-y-0 cursor-default focus-within:ring-[3px] focus-within:ring-[#24a06b]/15 focus-within:border-border-focus transition-all">
            <textarea
              className="w-full h-full min-h-[200px] p-[16px] text-[14px] text-text-primary placeholder:text-text-disabled resize-none bg-surface-0 border-none outline-none leading-[22px]"
              placeholder="Example: The Infotainment Head Unit (HU) runs Android Automotive 12. It connects to the Telematics Gateway over Automotive Ethernet. External interfaces include Bluetooth and Wi-Fi..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />

            {textInput.length === 0 && (
              <div className="px-[16px] pb-[16px] border-t border-border-subtle pt-[12px] bg-[#f9fafb]">
                <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase">Try exploring a template:</p>
                <div className="flex gap-[8px] flex-wrap">
                  <span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("The infotainment unit talks to the CAN bus.")}>Connected Car Basic</span>
                  <span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("An EV charging station exposes a REST API over LTE for remote management. It connects to the OCPP backend and communicates with the vehicle over ISO 15118.")}>EV Charging Station</span>
                  <span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("A V2X roadside unit broadcasts CAM and DENM messages over 802.11p. It connects to a C-ITS backend server over TLS.")}>V2X Component</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="flex flex-col items-center justify-center h-[240px] text-center border border-dashed border-border-default rounded-[12px] bg-surface-1">
          <ListTree className="w-[28px] h-[28px] text-text-disabled mb-3" />
          <p className="text-[13px] font-semibold text-text-primary">Structured Form</p>
          <p className="text-[12px] text-text-muted mt-1">Coming in next release</p>
        </div>
      )}

      {activeTab === 'file' && (
        <div className="flex flex-col items-center justify-center h-[240px] text-center border border-dashed border-border-default rounded-[12px] bg-surface-1">
          <UploadCloud className="w-[28px] h-[28px] text-text-disabled mb-3" />
          <p className="text-[13px] font-semibold text-text-primary">File Upload</p>
          <p className="text-[12px] text-text-muted mt-1">Upload .arxml, .json, or .yaml system models</p>
          <p className="text-[11px] text-text-disabled mt-1">Coming in next release</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-[20px] flex items-center justify-between">
        <button className="btn-secondary btn-md" disabled={!textInput} onClick={() => setTextInput('')}>
          Clear Input
        </button>
        <div className="flex items-center gap-[12px]">
          {error && <p className="text-[13px] text-[#b42318] font-medium">{error}</p>}
          <button
            className={clsx("btn-primary btn-md flex gap-[8px]", isProcessing && "animate-pulse")}
            disabled={!textInput.trim() || isProcessing || !activeProjectId}
            onClick={handleStartAnalysis}
          >
            {isProcessing ? (
              <div className="w-[16px] h-[16px] border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-[16px] h-[16px]" fill="white" />
            )}
            {isProcessing ? 'Starting Analysis...' : 'Start Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
