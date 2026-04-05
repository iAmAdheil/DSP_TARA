import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Network, Search, MousePointerClick, Loader2, ArrowRight } from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import { useAssets } from '../hooks/useAssets';
import type { AssetDetail } from '../types';
import { colors, getKindShape } from '../lib/colors';
import { buildGraphElements } from '../lib/graphElements';

cytoscape.use(cytoscapeDagre);

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Cytoscape stylesheet — no edge labels here; rendered via React overlay
// ---------------------------------------------------------------------------
const CY_STYLESHEET: any = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'shape': 'data(shape)' as cytoscape.Css.PropertyValueNode<'shape'>,
      'border-width': 1,
      'border-color': colors.borderDefault,
      'label': 'data(name)',
      'text-wrap': 'wrap',
      'text-max-width': '90px',
      'font-size': '11px',
      'font-family': 'Inter, SF Pro Text, Segoe UI, sans-serif',
      'color': '#1f2937',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 100,
      'height': 60,
    },
  },
  {
    selector: 'node.trust-boundary',
    style: {
      'background-color': colors.surfaceSubtle,
      'background-opacity': 0.6,
      'shape': 'roundrectangle',
      'border-width': 2,
      'border-style': 'dashed',
      'border-color': '#cfd6de',
      'label': 'data(label)',
      'font-size': '11px',
      'font-family': 'Inter, SF Pro Text, Segoe UI, sans-serif',
      'color': '#6b7280',
      'text-valign': 'top',
      'text-halign': 'left',
      'text-margin-x': 8,
      'text-margin-y': 8,
      'padding': '40px',
    },
  },
  {
    selector: 'node.dimmed',
    style: { 'opacity': 0.15 },
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': colors.borderFocus,
      'border-width': 2,
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'line-color': colors.edgeLine,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': colors.edgeLine,
      'width': 1.5,
    },
  },
  {
    selector: 'edge.dimmed',
    style: { 'opacity': 0.15 },
  },
];

const CY_LAYOUT = {
  name: 'dagre',
  rankDir: 'LR',
  nodeSep: 160,
  rankSep: 300,
  padding: 80,
};

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
type LegendProps = { kindColorMap: Map<string, string> };

function GraphLegend({ kindColorMap }: LegendProps) {
  const entries = [...kindColorMap.entries()];
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 20,
        background: '#ffffff',
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 1px 3px rgba(16,24,40,0.10)',
        minWidth: 140,
        maxWidth: 200,
      }}
    >
      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
            Node Kinds
          </p>
          {entries.map(([kind, color]) => {
            const shape = getKindShape(kind);
            return (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: shape === 'ellipse' ? '50%' : 3,
                    background: color,
                    transform: shape === 'diamond' ? 'rotate(45deg)' : undefined,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: '#4b5563', textTransform: 'capitalize' }}>{kind}</span>
              </div>
            );
          })}
        </>
      )}
      <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, marginTop: entries.length > 0 ? 8 : 0 }}>
        Edge Labels
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 12, height: 3, background: colors.edgeProtocol, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#4b5563' }}>Protocol</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 3, background: colors.edgeClassification, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#4b5563' }}>Data Classification</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function ModelExplorer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const [selectedNode, setSelectedNode] = useState<AssetDetail | null>(null);
  const [filterText, setFilterText] = useState('');

  const cyRef = useRef<cytoscape.Core | null>(null);
  // Overlay div for edge labels — updated imperatively to avoid per-frame React re-renders
  const edgeLabelOverlayRef = useRef<HTMLDivElement>(null);

  const { data: assetsPayload, isLoading } = useAssets(runId);

  // Redraws node kind labels and edge labels at their correct screen positions.
  // Called on layoutstop, viewport (pan/zoom), and after filter changes.
  const updateOverlay = useCallback(() => {
    const cy = cyRef.current;
    const overlay = edgeLabelOverlayRef.current;
    if (!cy || !overlay) return;

    const zoom = cy.zoom();
    const pan = cy.pan();
    const parts: string[] = [];

    // Node kind labels — rendered above each asset node using renderedBoundingBox
    cy.nodes().not('.trust-boundary').forEach((node) => {
      const kind = (node.data('kind') as string) || '';
      if (!kind) return;
      const bb = node.renderedBoundingBox({});
      const centerX = (bb.x1 + bb.x2) / 2;
      const topY = bb.y1;
      const opacity = node.hasClass('dimmed') ? 0.15 : 1;
      parts.push(
        `<div style="position:absolute;left:${centerX}px;top:${topY}px;transform:translate(-50%,-100%);text-align:center;opacity:${opacity};pointer-events:none;">` +
        `<span style="font-size:${9 * zoom}px;font-weight:500;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">${escapeHtml(kind)}</span>` +
        '</div>',
      );
    });

    // Edge labels — protocol (sky) and data classification (amber) at edge midpoint
    cy.edges().forEach((edge) => {
      const protocol = (edge.data('protocol') as string) || '';
      const dc = (edge.data('dataClassification') as string) || '';
      if (!protocol && !dc) return;

      const mid = edge.midpoint();
      const x = mid.x * zoom + pan.x;
      const y = mid.y * zoom + pan.y;
      const opacity = edge.hasClass('dimmed') ? 0.15 : 1;

      parts.push(
        `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);text-align:center;opacity:${opacity};">` +
        (protocol
          ? `<div style="font-size:${10 * zoom}px;font-family:Inter,sans-serif;color:${colors.edgeProtocol};white-space:nowrap;line-height:1.5;">${escapeHtml(protocol)}</div>`
          : '') +
        (dc
          ? `<div style="font-size:${10 * zoom}px;font-family:Inter,sans-serif;color:${colors.edgeClassification};white-space:nowrap;line-height:1.5;">${escapeHtml(dc)}</div>`
          : '') +
        '</div>',
      );
    });

    overlay.innerHTML = parts.join('');
  }, []);

  // Apply filter highlight whenever filterText changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const term = filterText.trim().toLowerCase();
    if (!term) {
      cy.elements().removeClass('dimmed');
      updateOverlay();
      return;
    }

    cy.nodes().not('.trust-boundary').forEach((node) => {
      const name = (node.data('name') as string ?? '').toLowerCase();
      const kind = (node.data('kind') as string ?? '').toLowerCase();
      const matches = name.includes(term) || kind.includes(term);
      if (matches) {
        node.removeClass('dimmed');
      } else {
        node.addClass('dimmed');
      }
    });

    cy.edges().forEach((edge) => {
      const srcDimmed = edge.source().hasClass('dimmed');
      const tgtDimmed = edge.target().hasClass('dimmed');
      if (srcDimmed && tgtDimmed) {
        edge.addClass('dimmed');
      } else {
        edge.removeClass('dimmed');
      }
    });

    updateOverlay();
  }, [filterText, updateOverlay]);

  const handleCyInit = useCallback(
    (cy: cytoscape.Core) => {
      cyRef.current = cy;

      // Update overlay positions on layout completion and pan/zoom
      cy.on('layoutstop viewport', updateOverlay);

      cy.on('tap', 'node', (evt) => {
        const node = evt.target as cytoscape.NodeSingular;
        if (node.hasClass('trust-boundary')) return;
        const nodeId = node.id();
        const asset = assetsPayload?.assets.find((a) => a.id === nodeId) ?? null;
        setSelectedNode(asset);
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedNode(null);
        }
      });

      cy.fit();
    },
    [assetsPayload, updateOverlay],
  );

  if (!runId) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-[28px] h-[28px] text-accent-500 animate-spin" />
      </div>
    );
  }

  const assets = assetsPayload?.assets ?? [];
  const dataFlows = assetsPayload?.dataFlows ?? [];
  const trustBoundaries = assetsPayload?.trustBoundaries ?? [];

  const { elements, kindColorMap } = buildGraphElements(assets, dataFlows, trustBoundaries);

  return (
    <div className="flex gap-[20px] h-[calc(100vh-140px)] w-full">
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="mb-[24px] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight">Canonical Model Explorer</h2>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {assets.length} assets • {dataFlows.length} data flows
            </p>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 border border-border-default rounded-[12px] bg-surface-1 shadow-inner relative overflow-hidden">
          {/* Filter bar — absolute overlay */}
          <div className="absolute top-[16px] left-[16px] bg-white border border-border-subtle px-[10px] py-[6px] rounded-[8px] flex items-center gap-[8px] z-10 shadow-sm">
            <Search className="w-[14px] h-[14px] text-text-muted" />
            <input
              type="text"
              placeholder="Filter nodes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="text-[12px] border-none outline-none w-[140px] bg-transparent"
            />
          </div>

          {elements.length > 0 ? (
            <>
              <CytoscapeComponent
                elements={elements}
                stylesheet={CY_STYLESHEET}
                layout={CY_LAYOUT}
                cy={handleCyInit}
                style={{ width: '100%', height: '100%' }}
                userZoomingEnabled
                userPanningEnabled
              />
              {/* Edge label overlay — imperative HTML, avoids Cytoscape single-color limitation */}
              <div
                ref={edgeLabelOverlayRef}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}
              />
              <GraphLegend kindColorMap={kindColorMap} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[13px] text-text-muted">
              No assets to display.
            </div>
          )}
        </div>
      </div>

      {/* Right detail panel */}
      <div className="w-[360px] shrink-0 bg-surface-0 border border-border-subtle rounded-[12px] shadow-sm flex flex-col h-full sticky top-[20px] overflow-hidden">
        {selectedNode ? (
          <>
            <div className="p-[16px] border-b border-border-default bg-surface-1">
              <div className="flex items-center gap-2 mb-2 text-text-muted font-mono text-[11px]">
                <span>{selectedNode.id.slice(0, 8)}</span>
                <ArrowRight className="w-[10px] h-[10px]" />
                <span className="uppercase">{selectedNode.kind}</span>
              </div>
              <h3 className="text-[16px] font-bold text-text-primary">{selectedNode.name}</h3>
              <span className="filter-chip mt-2 bg-white border-border-subtle capitalize">{selectedNode.kind}</span>
            </div>

            <div className="p-[16px] flex-1 overflow-y-auto space-y-[20px]">
              {selectedNode.softwareInstances.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase text-text-muted mb-2">Software Instances</h4>
                  <div className="space-y-[6px]">
                    {selectedNode.softwareInstances.map((sw) => (
                      <div key={sw.id} className="bg-[#f8fafb] border border-border-subtle rounded-[8px] p-[10px] text-[13px]">
                        <p className="font-semibold text-text-primary">{sw.name}</p>
                        {sw.version && <p className="text-text-muted text-[11px]">v{sw.version}</p>}
                        {sw.cpe && <p className="text-text-muted text-[11px] font-mono truncate">{sw.cpe}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.safetyFunctions.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase text-text-muted mb-2">Safety Functions</h4>
                  <div className="space-y-[6px]">
                    {selectedNode.safetyFunctions.map((sf) => (
                      <div key={sf.id} className="flex items-center justify-between gap-2 text-[13px] p-[10px] bg-[#f8fafb] border border-border-subtle rounded-[8px]">
                        <span className="text-text-primary font-medium">{sf.name}</span>
                        {sf.asilLevel && (
                          <span className="text-accent-600 font-semibold text-[11px] whitespace-nowrap">{sf.asilLevel}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.softwareInstances.length === 0 && selectedNode.safetyFunctions.length === 0 && (
                <p className="text-[13px] text-text-muted">No additional details available for this asset.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-[20px] text-center h-full">
            <MousePointerClick className="w-[48px] h-[48px] text-text-disabled mb-[16px]" />
            <h4 className="text-[14px] font-semibold text-text-primary mb-[4px]">Select a Node</h4>
            <p className="text-[12px] text-text-muted">Click an entity on the canvas to inspect its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
