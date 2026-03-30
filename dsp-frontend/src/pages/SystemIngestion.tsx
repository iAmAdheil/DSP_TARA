import { useState } from 'react';
import { 
  FileText, 
  ListTree, 
  UploadCloud, 
  Play, 
  FileCheck,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';

export function SystemIngestion() {
  const [activeTab, setActiveTab] = useState<'text' | 'form' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);

  const { setActiveRunId } = useStore();

  const handleProcess = () => {
    setIsProcessing(true);
    // Simulate extraction
    setTimeout(() => {
      setExtractedItems([
        { id: 1, type: 'asset', label: 'Infotainment Head Unit', confidence: 0.95 },
        { id: 2, type: 'asset', label: 'Telematics Gateway', confidence: 0.88 },
        { id: 3, type: 'interface', label: 'Bluetooth Audio Profile', confidence: 0.92 },
      ]);
      setIsProcessing(false);
      setActiveRunId('new-run-123');
    }, 1500);
  };

  return (
    <div className="flex gap-[20px] h-[calc(100vh-140px)] w-full">
      
      {/* Central Input Pane */}
      <div className="flex-1 flex flex-col min-w-0 pr-[10px] overflow-y-auto w-full">
        <header className="mb-[24px]">
          <h2 className="text-[20px] font-bold text-text-primary mb-[8px] tracking-tight">System Input & Extraction</h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Describe your system architecture, components, and boundaries. The model will extract a canonical graph.
          </p>
        </header>

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

        {/* Composer - Input form based on spec */}
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
                      <span className="filter-chip hover:bg-[#e9edf1]">EV Charging Station</span>
                      <span className="filter-chip hover:bg-[#e9edf1]">V2X Component</span>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-[20px] flex items-center justify-between">
          <button className="btn-secondary btn-md">
            Clear Input
          </button>
          <div className="flex items-center gap-[12px]">
            <button className="btn-secondary btn-md" disabled={!textInput}>
              <FileCheck className="w-[16px] h-[16px] mr-[8px]" />
              Validate Schema
            </button>
            <button 
              className={clsx("btn-primary btn-md flex gap-[8px]", isProcessing && "animate-pulse")}
              disabled={!textInput || isProcessing}
              onClick={handleProcess}
            >
              {isProcessing ? (
                <div className="w-[16px] h-[16px] border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Zap className="w-[16px] h-[16px]" fill="white" />
              )}
              {isProcessing ? 'Parsing Components...' : 'Extract Model'}
            </button>
          </div>
        </div>
      </div>

      {/* Right side drawer panel (Extraction Preview) */}
      <div className="w-[360px] shrink-0 bg-surface-0 border border-border-subtle rounded-[12px] overflow-hidden flex flex-col h-full sticky top-[20px]">
        <div className="p-[16px] border-b border-border-subtle bg-surface-1">
          <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2">
            Extraction Preview
            {extractedItems.length > 0 && (
              <span className="bg-success-bg text-success-fg px-2 py-0.5 rounded text-[11px]">85% Quality</span>
            )}
          </h3>
        </div>

        <div className="p-[16px] flex-1 overflow-y-auto">
          {extractedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
               <div className="w-[48px] h-[48px] rounded-full bg-surface-2 flex items-center justify-center mb-[16px]">
                <ListTree className="w-[24px] h-[24px] text-text-disabled" />
               </div>
               <p className="text-[13px] font-semibold text-text-primary mb-[4px]">Waiting for input</p>
               <p className="text-[12px] text-text-muted">Extracted assets, boundaries, and assumptions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-[16px]">
              <div>
                <h4 className="text-[11px] font-semibold text-text-muted uppercase mb-2">Identified Assets</h4>
                <div className="space-y-[8px]">
                  {extractedItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-[10px] rounded-[8px] border border-border-subtle bg-white">
                      {item.confidence > 0.9 ? (
                        <CheckCircle2 className="w-[14px] h-[14px] text-success-fg mt-0.5" />
                      ) : (
                        <AlertCircle className="w-[14px] h-[14px] text-warning-fg mt-0.5" />
                      )}
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">{item.label}</p>
                        <p className="text-[11px] text-text-muted mt-0.5 capitalize">{item.type} • {(item.confidence * 100).toFixed(0)}% confidence</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {extractedItems.length > 0 && (
          <div className="p-[12px] border-t border-border-subtle bg-white">
            <button className="btn-primary w-full h-[36px] flex justify-center items-center gap-2">
              <Play className="w-[14px] h-[14px] fill-current" />
              Confirm & Generate Threats
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
