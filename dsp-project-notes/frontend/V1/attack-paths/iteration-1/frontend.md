# Attack Paths — Frontend Changes (Iteration 1)

## Goal

Replace the current linear timeline in the right panel with a proper directed-graph diagram using Cytoscape.js (already installed). Add a persistent initial access card above the diagram. Show per-edge reasoning and mitigation on arrow hover.

All changes are in `src/pages/AttackPaths.tsx`. No new hooks, no new routes.

---

## Context: new fields from the backend

After the backend iteration-1 changes, the `AttackPath` type gains:
- `startAsset: { id, name, kind } | null` — resolved name for the entry node
- `initialAccessDescription: string | null` — how the attacker gets into the entry node
- `startSurface` — still present (asset ID), but use `startAsset.name` for display

The `PathHop` type gains:
- `edgeReasoning: string | null` — why the attacker can move from the previous hop to this one
- `edgeMitigation: string | null` — the most effective control to block this traversal

`edgeReasoning` and `edgeMitigation` are `null` on the first hop (hop 1 = the start node, no incoming edge).

Run `npm run api:types` once the backend doc is implemented; no manual changes to `src/generated/api.ts` or `src/types.ts`.

---

## Overview of right panel changes

**Current:** A vertical dashed-line timeline that lists each hop as a plain text card.

**New:** Two stacked sections:
1. A **Initial Access card** — always visible, shows `initialAccessDescription`
2. A **Cytoscape directed graph** — nodes are assets, directed edges are labeled with protocol; hovering an edge shows a floating tooltip with reasoning and mitigation

```
┌─────────────────────────────────────────────────────────┐
│  Attack Sequence                          Fr: 0.85  Im: 0.9 │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🔓  Initial Access                                  │ │
│  │  An attacker exploiting CVE-2023-XXXX in TCU        │ │
│  │  firmware gains remote code execution via the       │ │
│  │  exposed 4G/LTE interface.                          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [TCU] ──CAN──> [Gateway] ──CAN──> [Brake ECU]      │ │
│  │         (graph canvas, interactive)                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [floating tooltip appears near hovered edge]            │
└─────────────────────────────────────────────────────────┘
```

---

## 1 — List panel: use `startAsset.name`

The list cards currently display `path.startSurface` (raw asset ID, looks like a cuid). Replace with `path.startAsset?.name ?? '—'`.

**Card start node display:**
```tsx
<span className="font-semibold truncate max-w-[120px]">
  {path.startAsset?.name ?? '—'}
</span>
```

The search filter currently searches `p.startSurface`. Update it to also search `p.startAsset?.name`:
```ts
const filtered = (paths ?? []).filter((p) =>
  !search ||
  (p.targetAsset?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
  (p.startAsset?.name ?? '').toLowerCase().includes(search.toLowerCase())
);
```

---

## 2 — Right panel: state and layout

Add a `hoveredEdge` state to track which edge is currently hovered and where the tooltip should appear:

```tsx
const [hoveredEdge, setHoveredEdge] = useState<{
  edgeReasoning: string;
  edgeMitigation: string;
  x: number;
  y: number;
} | null>(null);
```

The right panel container needs `position: relative` so the floating tooltip can be positioned inside it.

```tsx
<div className="flex-1 card-panel flex flex-col p-0 overflow-hidden shadow-sm bg-[#f8fafb] relative">
```

---

## 3 — Initial access card

Render above the graph canvas whenever a path is selected:

```tsx
{selectedPath.initialAccessDescription && (
  <div className="mx-[24px] mt-[24px] p-[16px] rounded-[10px] bg-[#fffbeb] border border-[#fde68a] flex gap-[12px]">
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
```

If `initialAccessDescription` is null (older runs), the card is simply not rendered — no fallback text needed.

---

## 4 — Cytoscape graph

### 4a — Build elements

Compute Cytoscape elements from `selectedPath` using `useMemo`. Edges are derived from consecutive hop pairs — each hop >= 2 carries the edge data from the previous hop.

```tsx
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
```

### 4b — Stylesheet

```tsx
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
```

### 4c — Layout

Use `cytoscape-dagre` with a left-to-right direction:

```tsx
const cytoscapeLayout = {
  name: 'dagre',
  rankDir: 'LR',
  nodeSep: 60,
  rankSep: 100,
  padding: 24,
};
```

### 4d — CytoscapeComponent and event wiring

```tsx
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);
```

Register the dagre extension once at module level (outside the component).

Inside the right panel, replace the existing timeline block with:

```tsx
<div className="flex-1 relative min-h-0" ref={graphContainerRef}>
  <CytoscapeComponent
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
        const rect = container.getBoundingClientRect();

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
</div>
```

`graphContainerRef` is a `useRef<HTMLDivElement>(null)` attached to the graph wrapper div.

**Note:** The `cy` callback fires on each render. Always call `cy.removeAllListeners()` first to avoid stacking duplicate event handlers.

---

## 5 — Edge hover tooltip

Render the tooltip as an absolutely-positioned div inside the `position: relative` right panel container. Clamp it inside the panel bounds.

```tsx
{hoveredEdge && (
  <div
    className="absolute z-50 pointer-events-none max-w-[280px] bg-white border border-border-default rounded-[10px] shadow-lg p-[14px] space-y-[10px]"
    style={{
      left: Math.min(hoveredEdge.x + 12, /* panel width - tooltip width */ 560),
      top: Math.min(hoveredEdge.y - 8, /* panel height - tooltip height */ 400),
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
```

Position the tooltip relative to the `graphContainerRef` div, not the viewport, using the `renderedPosition` coordinates from Cytoscape.

---

## 6 — Header row: show scores

Replace the existing `h3 "Attack Sequence"` header with a two-element row that shows path identity alongside key scores:

```tsx
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
```

---

## 7 — Empty state for zero paths

If the run has completed the attack paths step but returned zero paths (all scored ≤ 0.7), show a specific empty state in the list panel instead of the generic "No paths match the current search":

```tsx
{(paths ?? []).length === 0 && !isLoading && (
  <div className="flex flex-col items-center justify-center h-full text-center px-[24px]">
    <ShieldAlert className="w-[36px] h-[36px] text-text-disabled mb-[12px]" />
    <p className="text-[13px] font-semibold text-text-primary mb-[4px]">No high-confidence paths found</p>
    <p className="text-[12px] text-text-muted">
      All candidate paths scored below 0.7 feasibility. The system may have strong segmentation or the AI found no credible exploit chain.
    </p>
  </div>
)}
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/AttackPaths.tsx` | Full right-panel overhaul: replace timeline with Cytoscape graph; add initial access card; add edge hover tooltip; update list card to use `startAsset.name`; add zero-path empty state |
| `src/types.ts` | No manual changes — regenerated from `openapi.yaml` via `npm run api:types` |
| `src/hooks/useAttackPaths.ts` | No changes |
