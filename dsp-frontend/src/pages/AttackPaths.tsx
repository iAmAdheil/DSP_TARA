import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Route, Search, ShieldAlert, ArrowRightCircle, Loader2 } from 'lucide-react';
import { useAttackPaths } from '../hooks/useAttackPaths';
import type { AttackPath } from '../types';
import clsx from 'clsx';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

function deriveSeverity(score: number): { label: string; tag: string } {
  if (score >= 0.8) return { label: 'Critical', tag: 'tag-critical' };
  if (score >= 0.6) return { label: 'High',     tag: 'tag-high' };
  if (score >= 0.4) return { label: 'Medium',   tag: 'tag-medium' };
  return                     { label: 'Low',     tag: 'tag-low' };
}

const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '11px',
      'font-family': 'Geist, sans-serif',
      'font-weight': '600',
      width: 'label',
      height: 32,
      padding: '10px',
      shape: 'round-rectangle',
      'background-color': '#f1f5f9',
      'border-width': 1.5,
      'border-color': '#cbd5e1',
      color: '#1e293b',
    },
  },
  {
    selector: 'node[?isStart]',
    style: {
      'background-color': '#eff6ff',
      'border-color': '#3b82f6',
      color: '#1d4ed8',
    },
  },
  {
    selector: 'node[?isTarget]',
    style: {
      'background-color': '#fff1f2',
      'border-color': '#b42318',
      color: '#b42318',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': '10px',
      'font-family': 'Geist Mono, monospace',
      color: '#64748b',
      'text-background-color': '#f8fafb',
      'text-background-opacity': 1,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'edge[?crossesBoundary]',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
    },
  },
];

const cytoscapeLayout = {
  name: 'dagre',
  rankDir: 'LR',
  nodeSep: 60,
  rankSep: 100,
  padding: 24,
};

export function AttackPaths() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');
  const [selectedPath, setSelectedPath] = useState<AttackPath | null>(null);
  const [search, setSearch] = useState('');
  const [hoveredEdge, setHoveredEdge] = useState<{
    edgeReasoning: string;
    edgeMitigation: string;
    x: number;
    y: number;
  } | null>(null);

  const graphContainerRef = useRef<HTMLDivElement>(null);

  const { data: paths, isLoading } = useAttackPaths(runId);

  const cytoscapeElements = useMemo(() => {
    if (!selectedPath) return [];

    const nodes = selectedPath.steps.map((step) => ({
      data: {
        id: step.assetId,
        label: step.assetName,
        isStart: step.hop === 1,
        isTarget: step.assetId === selectedPath.targetAssetId,
      },
    }));

    const edges = selectedPath.steps
      .filter((step) => step.hop > 1)
      .map((step, idx) => {
        const prevStep = selectedPath.steps[step.hop - 2]; // hop is 1-based
        return {
          data: {
            id: `edge-${idx}`,
            source: prevStep.assetId,
            target: step.assetId,
            label: step.edgeProtocol ?? '',
            crossesBoundary: step.crossesTrustBoundary,
            edgeReasoning: step.edgeReasoning ?? '',
            edgeMitigation: step.edgeMitigation ?? '',
          },
        };
      });

    return [...nodes, ...edges];
  }, [selectedPath]);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-danger-bg flex items-center justify-center mb-[24px]">
          <Route className="w-[36px] h-[36px] text-danger-fg" />
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">No valid attack paths found</h2>
        <p className="text-[13px] text-text-secondary mb-[24px]">Please generate model and threats first.</p>
        <button className="btn-primary btn-md" onClick={() => navigate('/threats')}>
          Go to Threat Generation
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-[28px] h-[28px] text-accent-500 animate-spin" />
      </div>
    );
  }

  const filtered = (paths ?? []).filter((p) =>
    !search ||
    (p.targetAsset?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.startAsset?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-[24px] flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Attack Paths Builder</h2>
          <p className="text-[13px] text-text-secondary">Explore {paths?.length ?? 0} multi-step paths leading to target assets.</p>
        </div>
      </header>

      <div className="flex flex-1 gap-[20px] min-h-0">
        {/* Left panel — path list */}
        <div className="w-[400px] shrink-0 card-panel flex flex-col p-0 shadow-sm overflow-hidden">
          <div className="p-[16px] bg-surface-1 border-b border-border-default">
            <div className="relative mb-[12px]">
              <Search className="w-[14px] h-[14px] absolute left-[12px] top-[10px] text-text-muted" />
              <input
                type="text"
                placeholder="Search targets or surfaces..."
                className="input-base w-full pl-[32px] h-[32px] text-[12px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-[11px] font-bold uppercase text-text-muted tracking-tight">Ranked Paths by Risk Level</p>
          </div>
          <div className="flex-1 overflow-y-auto p-[12px] space-y-[12px] bg-surface-0">
            {(paths ?? []).length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-[24px]">
                <ShieldAlert className="w-[36px] h-[36px] text-text-disabled mb-[12px]" />
                <p className="text-[13px] font-semibold text-text-primary mb-[4px]">No high-confidence paths found</p>
                <p className="text-[12px] text-text-muted">
                  All candidate paths scored below 0.7 feasibility. The system may have strong segmentation or the AI found no credible exploit chain.
                </p>
              </div>
            )}
            {filtered.map(path => {
              const { label: sevLabel, tag: sevTag } = deriveSeverity(path.overallPathRisk);
              return (
                <div
                  key={path.id}
                  onClick={() => setSelectedPath(path)}
                  className={clsx(
                    "p-[16px] border rounded-[8px] cursor-pointer hover:-translate-y-px transition-all bg-white",
                    selectedPath?.id === path.id ? "border-accent-500 shadow-[inset_4px_0_0_0_var(--accent-500)]" : "border-border-default hover:border-border-strong hover:shadow-xs"
                  )}
                >
                  <div className="flex justify-between items-start mb-[8px]">
                    <span className="text-[12px] font-bold text-text-secondary font-mono">{path.id.slice(0, 8)}</span>
                    <span className={clsx(sevTag, "text-[10px] px-1")}>{sevLabel}</span>
                  </div>
                  <div className="flex items-center gap-[8px] text-[13px]">
                    <span className="font-semibold truncate max-w-[120px]">{path.startAsset?.name ?? '—'}</span>
                    <ArrowRightCircle className="w-[14px] h-[14px] text-text-muted shrink-0" />
                    <span className="font-semibold truncate max-w-[120px]">{path.targetAsset?.name ?? '—'}</span>
                  </div>
                  <div className="mt-[12px] flex items-center justify-between text-[11px] text-text-muted">
                    <span>{path.steps.length} Steps</span>
                    <span>
                      Fr: {path.feasibilityScore.toFixed(2)} • Im: {path.impactScore.toFixed(2)}
                      {path.trustBoundaryCrossings > 0 && (
                        <span className="ml-2 px-[5px] py-[1px] rounded bg-surface-2 text-[10px] font-semibold">{path.trustBoundaryCrossings} boundaries</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (paths ?? []).length > 0 && (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-text-muted">
                No paths match the current search.
              </div>
            )}
          </div>
        </div>

        {/* Right panel — path visualizer */}
        <div className="flex-1 card-panel flex flex-col p-0 overflow-hidden shadow-sm bg-[#f8fafb] relative">
          {selectedPath ? (
            <>
              {/* Header row with scores */}
              <div className="flex items-center justify-between px-[24px] pt-[20px] pb-0 shrink-0">
                <h3 className="text-[16px] font-bold text-text-primary">Attack Sequence</h3>
                <div className="flex gap-[12px] text-[12px] text-text-muted font-semibold">
                  <span>Feasibility <span className="text-text-primary">{selectedPath.feasibilityScore.toFixed(2)}</span></span>
                  <span>·</span>
                  <span>Impact <span className="text-text-primary">{selectedPath.impactScore.toFixed(2)}</span></span>
                  {selectedPath.trustBoundaryCrossings > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-[#b45309]">{selectedPath.trustBoundaryCrossings} boundary crossings</span>
                    </>
                  )}
                </div>
              </div>

              {/* Initial access card */}
              {selectedPath.initialAccessDescription && (
                <div className="mx-[24px] mt-[24px] p-[16px] rounded-[10px] bg-[#fffbeb] border border-[#fde68a] flex gap-[12px] shrink-0">
                  <span className="text-[18px] shrink-0">🔓</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[#92400e] mb-[4px] tracking-wide">
                      Initial Access
                    </p>
                    <p className="text-[13px] text-[#78350f] leading-[20px]">
                      {selectedPath.initialAccessDescription}
                    </p>
                  </div>
                </div>
              )}

              {/* Cytoscape graph */}
              <div className="flex-1 relative min-h-0 mx-[24px] my-[16px]" ref={graphContainerRef}>
                <CytoscapeComponent
                  key={selectedPath.id}
                  elements={cytoscapeElements}
                  stylesheet={cytoscapeStylesheet}
                  layout={cytoscapeLayout}
                  style={{ width: '100%', height: '100%' }}
                  cy={(cy) => {
                    cy.removeAllListeners();

                    cy.on('mouseover', 'edge', (evt) => {
                      const edge = evt.target;
                      const reasoning = edge.data('edgeReasoning') as string;
                      const mitigation = edge.data('edgeMitigation') as string;
                      if (!reasoning && !mitigation) return;

                      const renderedPos = evt.renderedPosition ?? evt.position;
                      const container = graphContainerRef.current;
                      if (!container) return;

                      setHoveredEdge({
                        edgeReasoning: reasoning,
                        edgeMitigation: mitigation,
                        x: renderedPos.x,
                        y: renderedPos.y,
                      });
                    });

                    cy.on('mouseout', 'edge', () => setHoveredEdge(null));
                  }}
                />

                {/* Edge hover tooltip */}
                {hoveredEdge && (
                  <div
                    className="absolute z-50 pointer-events-none max-w-[280px] bg-white border border-border-default rounded-[10px] shadow-lg p-[14px] space-y-[10px]"
                    style={{
                      left: Math.min(hoveredEdge.x + 12, 560),
                      top: Math.min(hoveredEdge.y - 8, 400),
                    }}
                  >
                    {hoveredEdge.edgeReasoning && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-text-muted mb-[4px] tracking-wide">
                          Why possible
                        </p>
                        <p className="text-[12px] text-text-primary leading-[18px]">
                          {hoveredEdge.edgeReasoning}
                        </p>
                      </div>
                    )}
                    {hoveredEdge.edgeMitigation && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[#166534] mb-[4px] tracking-wide">
                          How to block it
                        </p>
                        <p className="text-[12px] text-[#166534] leading-[18px]">
                          {hoveredEdge.edgeMitigation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
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
