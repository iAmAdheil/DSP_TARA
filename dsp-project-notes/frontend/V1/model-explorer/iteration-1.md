# Model Explorer — Interactive Graph View

## Aim

Replace the current flat grid of asset boxes in `ModelExplorer.tsx` with an interactive directed graph. The user should be able to see the full system architecture at a glance — what components exist, how they connect, and in which direction data flows — and click any component to inspect its details in a side panel.

---

## Dependencies to Install

```
cytoscape              — core graph engine (layout, events, rendering)
react-cytoscapejs      — React wrapper for Cytoscape
cytoscape-dagre        — dagre layout plugin for Cytoscape (bundles dagre internally)
@types/cytoscape       — TypeScript types
```

---

## Visual Design

### Nodes (Assets)

Each asset is a node. The kind list is open-ended — the AI can produce any kind string — so colors are **not hardcoded per kind**. Instead, color is computed deterministically from the kind string using `getKindColor(kind)` from `src/lib/colors.ts` (see Theme System Spec §12).

Color is stored as a `data` property on each Cytoscape element so the stylesheet can reference it via `data(color)`. This means:
- No per-kind CSS classes
- Any new kind automatically gets a stable, distinct color
- The legend is built from whatever kinds appear in the current run, each calling `getKindColor`

**Shape** is also derived from the kind string using `getKindShape(kind)` — a small lookup that maps a handful of known kinds to distinct Cytoscape shapes, with a `roundrectangle` fallback for anything unrecognised:

| Known kind (case-insensitive) | Shape |
|---|---|
| sensor | `ellipse` |
| gateway | `diamond` |
| actuator | `hexagon` |
| anything else | `roundrectangle` |

Shape is also stored as `data(shape)` on each element and referenced in the stylesheet via `shape: data(shape)`.

Label inside each node: `{asset.name}` on line 1, `{asset.kind}` in smaller muted text on line 2. Use Cytoscape's `label` with `text-wrap: wrap` and a `\n` between name and kind.

### Edges (Data Flows)

Each `dataFlow` is a directed edge from `sourceId` → `targetId`.

- Arrow at the target end (directional) — use Cytoscape `target-arrow-shape: triangle`
- Two-line label on each edge, composed as `"{protocol}\n{dataClassification}"` using Cytoscape `label` with `text-wrap: wrap`
- Protocol line color: `colors.edgeProtocol` from `src/lib/colors.ts` (a fixed sky/blue — not hashed, always the same)
- Data Classification line color: `colors.edgeClassification` from `src/lib/colors.ts` (a fixed amber — not hashed, always the same)
- Edge line color: `colors.edgeLine` from `src/lib/colors.ts` (neutral gray)
- Use `curve-style: bezier` for clean curved edges between nodes

### Trust Boundary Containers

Cytoscape supports **compound nodes** natively — this is a first-class feature, not a workaround. Each trust boundary is a parent compound node. Assets that belong to it are child nodes.

Compound node styling:
- Shape: `roundrectangle`
- Border: `2px dashed`, color `--border-strong`
- Background: `--bg-surface-1` (`#f9fafb`) at low opacity (`0.6`)
- Label: trust boundary name, positioned `top-left`, `11px`, `--text-muted` color
- Padding: `40px` so child nodes have breathing room

Asset nodes with a trust boundary have their `parent` set to the boundary node's id in the Cytoscape element definition.

### Legend

A small fixed overlay panel positioned at the bottom-left of the canvas (outside the Cytoscape container, absolutely positioned over it). Implemented as a plain React component — not a Cytoscape element.

Contents:
- **Node kinds section**: one row per kind — colored shape swatch (a small `<div>` styled to match) + kind label
- **Edge labels section**: two rows:
  - Sky/blue swatch — "Protocol"
  - Amber swatch — "Data Classification"

All swatch colors sourced from `src/lib/colors.ts`.

### Layout

Use `cytoscape-dagre` plugin with `rankDir: 'LR'` (left-to-right). Register the plugin once at module level: `cytoscape.use(cytoscapeDagre)`.

Compound (trust boundary) nodes are included in the layout — Cytoscape-dagre handles them correctly when child nodes have their `parent` set.

---

## Behaviour

### Pan & Zoom
Cytoscape handles pan and zoom natively. Call `cy.fit()` on initial load to fit the full graph in view. Enable `userZoomingEnabled` and `userPanningEnabled`.

### Filter Bar
Keep the existing search/filter input. Filtering by name or kind highlights matching nodes; non-matching nodes are dimmed (not removed, so the graph structure remains readable).

### Node Click → Detail Panel
Clicking a node opens the existing right-side detail panel. The panel shows:

1. **Header**: asset name + kind badge
2. **Software Instances** (if any): list of name, version, CPE string — same as current implementation
3. **Safety Functions** (if any): list of function name + ASIL level badge — same as current implementation

**Remove** the "Data Flows" section from the panel — this information is now captured in the graph itself.

If the node has no software instances or safety functions, show: *"No additional details available for this asset."*

### Deselect
Clicking the canvas background deselects the node and closes/empties the panel (show the "Select a Node" placeholder).

---

## Changes Required

### `src/pages/ModelExplorer.tsx`

Full rewrite of the canvas section (currently the `flex-1 border ... rounded-[12px]` div containing the flat grid). Replace with a `<CytoscapeComponent>` from `react-cytoscapejs`.

Keep:
- The page header (title, asset/dataflow counts)
- The filter bar (keep as an absolutely positioned overlay on top of the canvas)
- The right-side detail panel (remove only the data flows sub-section)

Add:
- `<CytoscapeComponent>` filling the canvas area, with `stylesheet`, `elements`, and `layout` props
- A `cy` ref via the `cy={cy => { cyRef.current = cy }}` callback to attach event listeners
- `cy.on('tap', 'node', ...)` to handle node click → update selected node state → populate detail panel
- `cy.on('tap', ...)` on the background to deselect
- Filter bar wired to `cy.elements().addClass('dimmed')` / `removeClass('dimmed')` for matched/unmatched nodes
- Legend component (inline or separate file `src/components/GraphLegend.tsx`)

### New file: `src/lib/graphElements.ts`

Utility that accepts `assets`, `dataFlows`, and `trustBoundaries` (with `memberAssetIds`) and returns a Cytoscape `elements` array.

Structure:
1. Trust boundary nodes first — `{ data: { id, label }, classes: 'trust-boundary' }`
2. Asset nodes — `{ data: { id, label, kind, color: getKindColor(kind), shape: getKindShape(kind), parent? } }`
   - `parent` is set to the trust boundary node id if this asset has a membership
   - No per-kind CSS classes — color and shape come from data properties
3. Edge elements — `{ data: { id, source, target, protocol, dataClassification } }`

### Cytoscape Stylesheet

Defined as a constant (in `graphElements.ts` or inline in the component). Uses values imported from `src/lib/colors.ts`. Key rules:

- `node` base: `background-color: data(color)`, `shape: data(shape)`, border `1px solid colors.borderDefault`, label centered, `text-wrap: wrap`
- `node.trust-boundary`: compound node style — dashed border, `colors.surfaceSubtle` background at 60% opacity, label top-left
- `node.dimmed`, `edge.dimmed`: `opacity: 0.15` (for filter behaviour)
- `node:selected`: border color `colors.borderFocus`, border width `2px`
- `edge`: `curve-style: bezier`, line color `colors.edgeLine`, `target-arrow-shape: triangle`, two-line label with `text-wrap: wrap`

### `src/lib/colors.ts` (new file)

**See Theme System Spec §12 for the canonical token definitions.** This file is the single source of truth for all color values used in JS contexts (Cytoscape, charts, any library that can't read CSS variables).

Exports:
1. `CATEGORICAL_PALETTE: string[]` — ordered array of N hex colors (defined in §12)
2. `getKindColor(kind: string): string` — hashes the kind string to a palette index and returns the hex color. Uses djb2 hash, mod palette length. Same kind always returns the same color.
3. `getKindShape(kind: string): string` — maps known kind strings (case-insensitive) to Cytoscape shape names, falls back to `'roundrectangle'`
4. Named semantic constants for fixed-use colors (not hashed):
   - `colors.edgeProtocol` — sky blue, for protocol edge labels
   - `colors.edgeClassification` — amber, for data classification edge labels
   - `colors.edgeLine` — neutral gray, for edge lines
   - `colors.borderDefault`, `colors.borderFocus`, `colors.surfaceSubtle` — matching the theme tokens

Hex values must exactly match the CSS variables defined in Theme System Spec §12.

---

## What NOT to Change

- `useAssets` hook — no changes needed
- `SubsystemExplorer.tsx` — leave entirely as-is (deferred, separate discussion)
- Routing — no changes needed
- The right-panel detail logic — only remove the data flows sub-section
