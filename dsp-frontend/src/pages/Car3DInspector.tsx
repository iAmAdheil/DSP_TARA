import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initCar3D, PART_INFO, SUBSYSTEMS, PART_TO_SUBSYSTEM, getWorstSeverity,
  type EngineController, type Subsystem,
} from '../lib/car3dEngine';
import {
  ChevronDown, X, ShieldAlert, Info,
} from 'lucide-react';
import clsx from 'clsx';

const CAMERA_PRESETS = [
  { id: 'exterior', label: 'Exterior' },
  { id: 'top', label: 'Top Down' },
  { id: 'front', label: 'Front' },
  { id: 'engine', label: 'Engine Bay' },
  { id: 'underbody', label: 'Underbody' },
];

const SEV_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: 'bg-[#fff1f2]', text: 'text-[#b42318]', dot: 'bg-[#b42318]' },
  High:     { bg: 'bg-[#fff4f1]', text: 'text-[#d14343]', dot: 'bg-[#d14343]' },
  Medium:   { bg: 'bg-[#fff7e8]', text: 'text-[#9a6700]', dot: 'bg-[#c27a10]' },
  Low:      { bg: 'bg-[#eefbf4]', text: 'text-[#166445]', dot: 'bg-[#2f855a]' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEV_STYLES[severity] || SEV_STYLES.Low;
  return (
    <span className={clsx('inline-flex items-center px-[6px] py-[1px] rounded-[4px] text-[10px] font-bold uppercase tracking-wide', s.bg, s.text)}>
      {severity}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const s = SEV_STYLES[severity] || SEV_STYLES.Low;
  return <span className={clsx('w-[6px] h-[6px] rounded-full shrink-0', s.dot)} />;
}

export function Car3DInspector() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<EngineController | null>(null);

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [fps, setFps] = useState(0);

  const [bodyOpacity, setBodyOpacity] = useState(100);
  const [explodeSpread, setExplodeSpread] = useState(0);
  const [wheelSpin, setWheelSpin] = useState(true);
  const [wireframe, setWireframe] = useState(false);

  const [controlsOpen, setControlsOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Derived: active subsystem from selected part
  const activeSubsystemName = selectedPart ? PART_TO_SUBSYSTEM[selectedPart] ?? null : null;
  const activeSubsystem: Subsystem | null = activeSubsystemName ? SUBSYSTEMS[activeSubsystemName] : null;

  // Init engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctrl = initCar3D(canvasRef.current, {
      bgColor: '#f4f6f8',
      onHover: (name, x, y) => {
        setHoveredPart(name);
        setHoverPos({ x, y });
      },
      onSelect: (name) => { setSelectedPart(name); },
      onFps: (f) => { setFps(f); },
    });
    controllerRef.current = ctrl;
    return () => { ctrl.destroy(); controllerRef.current = null; };
  }, []);

  // When selection changes, highlight subsystem parts and dim everything else
  useEffect(() => {
    if (activeSubsystem) {
      controllerRef.current?.highlightParts(activeSubsystem.parts);
    } else {
      controllerRef.current?.highlightParts(null);
    }
  }, [activeSubsystem]);

  const handleOpacityChange = useCallback((v: number) => {
    setBodyOpacity(v);
    controllerRef.current?.setBodyOpacity(v / 100);
  }, []);

  const handleExplodeSpreadChange = useCallback((v: number) => {
    setExplodeSpread(v);
    controllerRef.current?.setExplodeSpread(v / 50);
    // Auto-activate/deactivate explode based on spread value
    controllerRef.current?.setExplodeActive(v > 0);
  }, []);

  const selectPartFromList = useCallback((name: string) => {
    const newSel = selectedPart === name ? null : name;
    setSelectedPart(newSel);
    controllerRef.current?.selectPart(newSel);
  }, [selectedPart]);

  const clearSelection = useCallback(() => {
    setSelectedPart(null);
    controllerRef.current?.selectPart(null);
  }, []);

  // Hover tooltip CVE data
  const hoveredSubsystemName = hoveredPart ? PART_TO_SUBSYSTEM[hoveredPart] ?? null : null;
  const hoveredCves = hoveredSubsystemName ? SUBSYSTEMS[hoveredSubsystemName]?.cves ?? [] : [];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[16px] flex items-center gap-[8px]">
        <div>
          <div className="flex items-center gap-[8px]">
            <h2 className="text-[20px] font-bold text-text-primary tracking-tight">3D Car Inspector</h2>
            <div className="relative">
              <button
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                className="w-[20px] h-[20px] rounded-full border border-border-default flex items-center justify-center hover:bg-surface-2 transition-colors"
              >
                <Info className="w-[12px] h-[12px] text-text-muted" />
              </button>
              {showHelp && (
                <div className="absolute left-[28px] top-[-4px] bg-white border border-border-default rounded-[10px] shadow-md px-[14px] py-[10px] z-[30] w-[280px]">
                  <p className="text-[12px] font-semibold text-text-primary mb-[4px]">How to use</p>
                  <ul className="text-[11px] text-text-secondary leading-[18px] space-y-[2px]">
                    <li><strong>Drag</strong> to rotate the view</li>
                    <li><strong>Right-drag</strong> to pan</li>
                    <li><strong>Scroll</strong> to zoom in/out</li>
                    <li><strong>Click</strong> any part to inspect its subsystem and associated CVEs</li>
                    <li><strong>Hover</strong> to preview vulnerabilities</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <p className="text-[13px] text-text-secondary mt-[4px]">
            Interactive 3D automotive threat visualization. Click any component to inspect its subsystem CVEs.
          </p>
        </div>
      </header>

      <div className="flex-1 flex gap-[16px] min-h-0">
        {/* Left controls panel */}
        <div className="w-[220px] shrink-0 flex flex-col gap-[12px] overflow-y-auto">
          <div className="card-panel p-0">
            <button
              onClick={() => setControlsOpen(v => !v)}
              className="w-full flex items-center justify-between px-[14px] py-[10px] text-[12px] font-semibold text-text-muted uppercase tracking-wider hover:bg-surface-1 transition-colors"
            >
              Controls
              <ChevronDown className={clsx('w-[14px] h-[14px] transition-transform', !controlsOpen && '-rotate-90')} />
            </button>

            {controlsOpen && (
              <div className="px-[14px] pb-[14px] space-y-[14px]">
                {/* Body Opacity */}
                <div>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-[6px]">
                    Body Opacity: {bodyOpacity}%
                  </p>
                  <input
                    type="range" min={5} max={100} value={bodyOpacity}
                    onChange={e => handleOpacityChange(Number(e.target.value))}
                    className="w-full h-[4px] rounded-full appearance-none bg-border-default accent-accent-500 cursor-pointer"
                  />
                </div>

                {/* Exploded View — spread slider directly controls explode */}
                <div>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-[6px]">
                    Explode Spread: {(explodeSpread / 50).toFixed(1)}x
                  </p>
                  <input
                    type="range" min={0} max={100} value={explodeSpread}
                    onChange={e => handleExplodeSpreadChange(Number(e.target.value))}
                    className="w-full h-[4px] rounded-full appearance-none bg-border-default accent-accent-500 cursor-pointer"
                  />
                </div>

                {/* Wheel Spin */}
                <div>
                  <button
                    onClick={() => { setWheelSpin(v => !v); controllerRef.current?.setAnimState('wheels', !wheelSpin); }}
                    className="w-full h-[32px] px-[10px] rounded-[8px] flex items-center justify-between text-[13px] font-medium text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    Wheel Spin
                    <div className={clsx(
                      'w-[32px] h-[16px] rounded-full transition-colors relative',
                      wheelSpin ? 'bg-accent-500' : 'bg-border-default'
                    )}>
                      <div className={clsx(
                        'absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white shadow-xs transition-all',
                        wheelSpin ? 'left-[18px]' : 'left-[2px]'
                      )} />
                    </div>
                  </button>
                </div>

                {/* Camera Presets */}
                <div>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-[8px]">Camera Presets</p>
                  <div className="grid grid-cols-2 gap-[4px]">
                    {CAMERA_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => controllerRef.current?.tweenCam(p.id)}
                        className="h-[30px] px-[8px] rounded-[8px] border border-border-default bg-white text-[11px] font-semibold text-text-secondary hover:bg-surface-2 hover:border-border-strong transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wireframe */}
                <div>
                  <button
                    onClick={() => { setWireframe(v => !v); controllerRef.current?.setWireframe(!wireframe); }}
                    className="w-full h-[32px] px-[10px] rounded-[8px] flex items-center justify-between text-[13px] font-medium text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    Wireframe
                    <div className={clsx(
                      'w-[32px] h-[16px] rounded-full transition-colors relative',
                      wireframe ? 'bg-accent-500' : 'bg-border-default'
                    )}>
                      <div className={clsx(
                        'absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white shadow-xs transition-all',
                        wireframe ? 'left-[18px]' : 'left-[2px]'
                      )} />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 card-panel p-0 overflow-hidden relative min-h-0">
          <canvas
            ref={canvasRef}
            className="w-full h-full block rounded-[12px]"
          />

          {/* FPS badge */}
          <div className="absolute top-[12px] right-[12px] h-[28px] px-[10px] rounded-[8px] bg-white/90 border border-border-default flex items-center gap-[6px] backdrop-blur-sm">
            <span className="w-[6px] h-[6px] rounded-full bg-accent-500" />
            <span className="text-[11px] font-semibold text-text-muted">{fps} FPS</span>
          </div>

          {/* Selection info banner */}
          {selectedPart && activeSubsystem && (
            <div className="absolute bottom-[32px] left-1/2 -translate-x-1/2 bg-white/95 border border-border-default rounded-[10px] px-[16px] py-[10px] text-center backdrop-blur-sm shadow-sm min-w-[280px] z-[5]">
              <p className="text-[14px] font-bold text-text-primary">{selectedPart}</p>
              <p className="text-[12px] text-text-secondary mt-[2px]">
                Subsystem: <span className="font-semibold text-text-primary">{activeSubsystem.name}</span>
                {' '}&bull; {activeSubsystem.cves.length} CVE{activeSubsystem.cves.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Hover tooltip with CVEs */}
          {hoveredPart && PART_INFO[hoveredPart] && !selectedPart && (
            <div
              className="fixed bg-white/95 border border-border-default rounded-[10px] pointer-events-none shadow-md backdrop-blur-sm z-[30] max-w-[300px]"
              style={{ left: Math.min(hoverPos.x + 14, window.innerWidth - 320), top: Math.max(hoverPos.y - 8, 8) }}
            >
              <div className="px-[12px] pt-[10px] pb-[6px] border-b border-border-subtle">
                <p className="text-[13px] font-bold text-text-primary">{hoveredPart}</p>
                <p className="text-[11px] text-text-muted">{PART_INFO[hoveredPart].desc}</p>
                {hoveredSubsystemName && (
                  <p className="text-[10px] text-text-muted mt-[2px]">
                    Subsystem: <span className="font-semibold">{hoveredSubsystemName}</span>
                  </p>
                )}
              </div>
              {hoveredCves.length > 0 && (
                <div className="px-[12px] py-[8px]">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-[4px]">
                    Vulnerabilities ({hoveredCves.length})
                  </p>
                  <div className="space-y-[4px]">
                    {hoveredCves.slice(0, 4).map(cve => (
                      <div key={cve.id} className="flex items-center gap-[6px]">
                        <SeverityDot severity={cve.severity} />
                        <span className="text-[11px] font-mono font-semibold text-text-secondary">{cve.id}</span>
                        <span className="text-[10px] text-text-muted truncate">{cve.severity}</span>
                      </div>
                    ))}
                    {hoveredCves.length > 4 && (
                      <p className="text-[10px] text-text-muted">+{hoveredCves.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom hint bar */}
          <div className="absolute bottom-0 left-0 right-0 px-[16px] py-[6px] bg-gradient-to-t from-white/80 to-transparent">
            <p className="text-[11px] text-text-muted text-center">
              LMB: Rotate &nbsp;&bull;&nbsp; RMB: Pan &nbsp;&bull;&nbsp; Scroll: Zoom &nbsp;&bull;&nbsp; Click: Inspect Subsystem
            </p>
          </div>
        </div>

        {/* Right panel — subsystem detail (only when selected) */}
        {activeSubsystem && (
          <div className="w-[260px] shrink-0 flex flex-col gap-[12px] overflow-y-auto">
            {/* Subsystem header */}
            <div className="card-panel p-0">
              <div className="px-[14px] py-[10px] flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-[8px]">
                  <ShieldAlert className="w-[16px] h-[16px] text-text-muted" />
                  <span className="text-[13px] font-bold text-text-primary">{activeSubsystem.name}</span>
                </div>
                <button
                  onClick={clearSelection}
                  className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center hover:bg-surface-2 transition-colors"
                  title="Close"
                >
                  <X className="w-[14px] h-[14px] text-text-muted" />
                </button>
              </div>

              {/* Parts in this subsystem */}
              <div className="px-[14px] py-[10px]">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-[6px]">
                  Components ({activeSubsystem.parts.length})
                </p>
                <div className="flex flex-wrap gap-[4px]">
                  {activeSubsystem.parts.map(part => (
                    <button
                      key={part}
                      onClick={() => selectPartFromList(part)}
                      className={clsx(
                        'h-[26px] px-[8px] rounded-[6px] text-[11px] font-medium border transition-colors',
                        selectedPart === part
                          ? 'bg-accent-50 border-accent-200 text-accent-700'
                          : 'bg-surface-1 border-border-default text-text-secondary hover:bg-surface-2'
                      )}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CVE detail table */}
            <div className="card-panel p-0 flex-1">
              <div className="px-[14px] py-[10px] border-b border-border-subtle flex items-center justify-between">
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
                  CVEs ({activeSubsystem.cves.length})
                </p>
                {(() => {
                  const worst = getWorstSeverity(activeSubsystem.cves);
                  return worst ? <SeverityBadge severity={worst} /> : null;
                })()}
              </div>
              <div className="divide-y divide-border-subtle">
                {activeSubsystem.cves.map(cve => (
                  <div key={cve.id} className="px-[14px] py-[10px] hover:bg-surface-1 transition-colors">
                    <div className="flex items-center justify-between mb-[4px]">
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[12px] font-mono font-bold text-text-primary">{cve.id}</span>
                        <SeverityBadge severity={cve.severity} />
                      </div>
                      <span className={clsx(
                        'text-[11px] font-bold',
                        cve.cvss >= 9 ? 'text-[#b42318]' :
                        cve.cvss >= 7 ? 'text-[#d14343]' :
                        cve.cvss >= 4 ? 'text-[#c27a10]' :
                        'text-[#2f855a]'
                      )}>
                        {cve.cvss.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-[16px]">{cve.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
