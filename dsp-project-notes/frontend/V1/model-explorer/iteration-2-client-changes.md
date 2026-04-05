# Model Explorer — Iteration 2 Client-Directed Changes

These are changes made directly from client feedback during the iteration 2 implementation session, outside the original iteration-2.md spec. Documented by the frontend dev agent.

---

## 1. Edge Label Colors — Cytoscape Limitation Workaround

**Client instruction:** Protocol and data classification text have the same color — fix it.

**Root cause discovered:** Cytoscape.js `color` is a shared property applied to all labels on an edge (`label`, `source-label`, `target-label`). There is no per-label color override — confirmed from Cytoscape.js source. `source-text-color` and `source-label-color` are not valid properties.

**Fix implemented:** Removed all edge labels from the Cytoscape stylesheet entirely. Added an absolutely-positioned HTML overlay div (`edgeLabelOverlayRef`) rendered over the canvas with `pointer-events: none`. A `updateOverlay()` function reads `edge.midpoint()` positions, converts to screen coords via `cy.zoom()` + `cy.pan()`, and writes protocol (sky) + data classification (amber) as separate `<div>` elements into the overlay imperatively. Updates on `layoutstop` and `viewport` events.

---

## 2. Node Kind Label — Replaced cytoscape-node-html-label with Overlay

**Client instruction:** Use a similar approach to edge labels — render the node kind text above the shape via the overlay rather than the HTML label plugin.

**Fix implemented:** Removed `cytoscape-node-html-label` dependency and its `cy.nodeHtmlLabel()` call. Extended `updateOverlay()` to also iterate `cy.nodes().not('.trust-boundary')`, call `node.renderedBoundingBox({})` to get screen-space bounding box directly, and render kind text centered above the node top edge via `transform: translate(-50%, -100%)`. Both node kind labels and edge labels are now written in a single `overlay.innerHTML` pass.

---

## 3. Overlay Text Scales with Zoom

**Client instruction:** Type text and arrow text don't scale with zoom-in/out — the text inside the shape does scale but the overlay text stays fixed.

**Fix implemented:** Font sizes in the overlay are multiplied by `cy.zoom()` at render time — `${9 * zoom}px` for kind labels and `${10 * zoom}px` for edge labels. Since `updateOverlay` already fires on every `viewport` event (which includes zoom), the sizes update every zoom step in sync with Cytoscape's native canvas.

---

## 4. Removed White Background from Overlay Text

**Client instruction:** Remove the `bg-white` color on arrow (edge) text.

**Fix:** Removed `background: rgba(255,255,255,0.85)`, `padding`, and `border-radius` from both protocol and data classification label `<div>` styles in the overlay.

---

## 5. Legend Position — Top Right

**Client instruction:** Shift the legend to top right.

**Fix:** Changed `bottom: 16; left: 16` → `top: 16; right: 16` on the `GraphLegend` container style.

---

## 6. Node Kind Label — Smaller Font, Closer to Shape

**Client instruction:** Decrease the font size and reduce the distance between the shape and the type text.

**Fix:** Font size reduced from `11px` to `9px` (before zoom scaling). Removed the `4px` gap offset — `top: topY` with `transform: translate(-50%, -100%)` now places the label bottom flush with the node top edge.

---

## 7. Node Spacing Increases

**Client instruction (two rounds):** Increase the initial gap between nodes (×2 requests).

**Final values set:**
- `nodeSep`: 60 → 100 → 160
- `rankSep`: 120 → 200 → 300
- `padding`: 40 → 60 → 80

---

## Implementation Notes

- `updateOverlay` is a single `useCallback` that handles both node kind labels and edge labels in one DOM write, avoiding redundant passes.
- The overlay div sits at `z-index: 5`, above the Cytoscape canvas but below the filter bar (`z-index: 10`) and legend (`z-index: 20`).
- Filter dimming (`opacity: 0.15`) is also applied to overlay elements by reading `node.hasClass('dimmed')` and `edge.hasClass('dimmed')` inside `updateOverlay`, which is called at the end of the filter `useEffect`.
