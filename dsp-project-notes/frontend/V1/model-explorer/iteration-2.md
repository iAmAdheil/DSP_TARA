# Model Explorer — Frontend Iteration 2

## Context

Iteration 1 is in place. Graph renders correctly with nodes, edges, filter, detail panel, and legend. This iteration addresses the failures and visual issues identified in QA findings and direct review of the screenshot.

Reference: `QA/V1/model-explorer/qa-findings-iteration-1.md`

---

## Changes Required

### 1. Kind Label Moved Above the Node Shape

**Problem:** The node currently shows both `name` and `kind` as a two-line label inside the shape. This is cluttered and causes confusion — the shape itself is already indicating type visually, and having both lines inside makes names hard to read (especially for longer names like "Infotainment Head Unit").

**Fix:** The `kind` label should appear as text **above** the node shape, outside its boundary. The shape itself shows only the `name`.

**Implementation:** Install and use the `cytoscape-node-html-label` plugin. This allows attaching arbitrary HTML elements to each node, positioned relative to the node's bounding box. Use it to render the kind text as a small `<span>` positioned above each asset node (not on trust boundary compound nodes).

- Kind label: `11px`, `--text-muted` color, centered above the node, `font-weight: 500`
- Node `label` in the Cytoscape stylesheet: set to `data(name)` only, `text-valign: center`, `text-halign: center`
- Do not attach HTML labels to trust boundary compound nodes — they already have their own label in the top-left corner

Install: `cytoscape-node-html-label` (check npm for current package name — may be `cytoscape-html-label`). Register at module level alongside `cytoscape-dagre`.

---

### 2. Edge Labels — Dual Color Fix

**Problem:** Both the protocol and data classification lines on each edge render in the same sky-blue color. Cytoscape's `label` property applies a single color to the entire label string — it cannot style individual lines differently.

**Fix:** Split the two pieces of information into separate Cytoscape label properties:
- `label`: protocol text — color `colors.edgeProtocol` (sky blue)
- `source-label`: data classification text — color `colors.edgeClassification` (amber)

Use `source-text-offset` to push the `source-label` toward the midpoint of the edge so both labels appear close together near the center of the edge, not near the source node.

Remove the `\n` joined single label entirely. Each property is set independently in the element `data` and referenced in the stylesheet via `data(protocol)` and `data(dataClassification)`.

---

### 3. Fix Node Shape Matching — Substring Match

**Problem (TC-03):** `getKindShape()` does an exact lowercase match (`SHAPE_MAP[kind.toLowerCase()]`). Since the AI produces descriptive kinds like "Embedded Controller" or "OCPP Gateway", not single-word kinds like "gateway", nothing ever matches and everything falls back to `roundrectangle`.

**Fix:** Change `getKindShape` in `src/lib/colors.ts` to use substring matching:

```ts
export function getKindShape(kind: string): string {
  const lower = kind.toLowerCase();
  if (lower.includes('sensor'))   return 'ellipse';
  if (lower.includes('gateway'))  return 'diamond';
  if (lower.includes('actuator')) return 'hexagon';
  return 'roundrectangle';
}
```

This way "OCPP Gateway", "Central Gateway", "Telematics Gateway" etc. all correctly resolve to `diamond`.

---

### 4. Fix Hash Color Distribution

**Problem (TC-02):** The `djb2 % palette.length` approach produces poor distribution for the specific kind strings the AI generates — QA found only 4 unique colors across 7 kinds.

**Fix:** Replace the hash-based approach with **sequential palette assignment by first-seen order**. As `graphElements.ts` builds the elements array, maintain a `Map<string, number>` of kind → palette index. The first new kind seen gets index 0, the second gets index 1, and so on. This guarantees zero collisions for up to 10 distinct kinds, which covers all realistic system sizes.

Update `src/lib/colors.ts`:
- Remove `getKindColor(kind: string)` (the hash function)
- Export `assignKindColors(kinds: string[]): Map<string, string>` instead — takes the full list of unique kinds from the current run, assigns palette colors in order, returns the map
- `graphElements.ts` calls this once before building elements, then uses `kindColorMap.get(asset.kind)` to set `data.color` on each node

The legend must use the same map so swatch colors match node colors exactly.

---

### 5. Hide Empty Trust Boundary Containers

**Problem:** When `memberAssetIds` is absent or empty (e.g. on runs created before the backend fix lands), trust boundary compound nodes are rendered as zero-size invisible elements that create visual artifacts.

**Fix:** In `graphElements.ts`, before adding a trust boundary node to the elements array, check if it has any `memberAssetIds`. If the array is empty or missing, skip it — do not add the compound node to the elements at all.

```ts
if (!tb.metadata?.memberAssetIds?.length) continue;
```

No error, no placeholder — just silently omit. Once the backend fix is in place, trust boundaries will populate correctly.

---

## What NOT to Change

- `useAssets` hook — no changes
- Detail panel logic — no changes (already correct from iteration 1)
- Filter bar logic — no changes
- Pan/zoom/fit-to-view — no changes
- Legend structure — update only to use `assignKindColors` map instead of `getKindColor`
