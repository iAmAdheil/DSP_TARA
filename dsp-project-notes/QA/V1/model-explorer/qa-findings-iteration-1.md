# QA Findings — Model Explorer: Interactive Graph View

**Date:** 2026-04-04
**Run ID:** `cmnjb64g50003uf3y1007rah2`
**Project:** EV Charging Station TARA
**Tester:** Claude (QA Agent)

---

## Part 1: Test Case Results

### TC-01 — Graph Renders

**Result: PASS**

- Canvas is present (1060x1036 Cytoscape canvas).
- 11 nodes rendered (9 asset nodes + 2 trust boundary compound nodes).
- 11 edges rendered with directional arrows.
- Header shows "9 assets - 11 data flows".
- Zero console errors, zero warnings.

---

### TC-02 — Node Colors Are Hash-Derived, Not Hardcoded

**Result: FAIL**

- Colors are hash-derived via `djb2()` hash function — not hardcoded. That part is correct.
- **However, severe hash collisions exist:** only **4 unique colors** across **7 distinct kinds**.
  - `Hardware Controller`, `HMI`, and `Cloud Service` all map to `rgb(239,68,68)` (red / `#ef4444`).
  - `Embedded Controller` and `Communication Module` both map to `rgb(20,184,166)` (teal / `#14b8a6`).
- The spec allows collisions but flags >2 as a problem. Here we have **5 kinds colliding into 2 colors** (3 red, 2 teal). Only `Physical Security Controller` (sky blue) and `Peripheral` (purple) have unique colors.
- **Root cause:** The `djb2` hash mod 10 palette produces poor distribution for these specific kind strings. With 7 kinds and 10 palette entries, getting only 4 unique colors is statistically bad.

**Observation:** The hash function works but its distribution is poor for these kinds. Consider using a seeded/salted variant or a different hash, or manually assign the first N kinds to avoid palette overlap.

---

### TC-03 — Node Shapes

**Result: FAIL**

- **All 9 asset nodes render as `roundrectangle`** — the default fallback shape.
- The `SHAPE_MAP` in `colors.ts` maps only exact lowercase matches: `sensor` -> ellipse, `gateway` -> diamond, `actuator` -> hexagon.
- The actual asset kinds from this run are: "Embedded Controller", "Hardware Controller", "Physical Security Controller", "Peripheral", "HMI", "Communication Module", "Cloud Service".
- **None of these contain exact matches** for "sensor", "gateway", or "actuator" as the full kind string.
- The `getKindShape()` function does `SHAPE_MAP[kind.toLowerCase()]` — this requires the kind to be _exactly_ "sensor", "gateway", or "actuator". It does not do partial/substring matching.
- For example, "OCPP Gateway" has kind "Embedded Controller" — even though it's a gateway conceptually, the kind string doesn't match.

**Observation:** The shape logic needs either: (a) partial/substring matching (e.g., `kind.toLowerCase().includes('gateway')`), (b) the AI ingestion to produce kinds that match the SHAPE_MAP keys, or (c) expanding the SHAPE_MAP with more kind entries.

---

### TC-04 — Edge Directionality

**Result: PASS**

- All 11 edges have `target-arrow-shape: "triangle"` and `source-arrow-shape: "none"`.
- Directions are correct — e.g., OCPP Gateway -> CSMS Backend (Operational Data), CSMS Backend -> OCPP Gateway (Control Commands).
- Bidirectional communication pairs (OCPP<->CSMS, OCPP<->Power Delivery, OCPP<->HIP, CSMS<->Billing, OCPP<->FW Server) are correctly represented as two separate directed edges — no double-headed arrows.

---

### TC-05 — Edge Labels (Protocol + Data Classification)

**Result: PARTIAL FAIL**

- Each edge correctly displays two lines of text — protocol on line 1 and data classification on line 2 (e.g., "OCPP 1.6J\nOperational Data").
- **However, both lines render in a single color:** `rgb(14,165,233)` (sky blue / `#0ea5e9`).
- The spec requires protocol in sky/blue and data classification in amber. The current Cytoscape edge style sets a single `color` property for the entire label — **Cytoscape's basic label styling does not support per-line coloring.**
- The legend correctly shows two separate color rows (Protocol = sky, Data Classification = amber), but this does not match what's rendered on the edges.

**Observation:** Implementing dual-colored edge labels requires either: (a) using Cytoscape's `source-label` / `target-label` to separate the two text lines with different colors, or (b) using canvas overlays / HTML labels. This is a known limitation of the Cytoscape basic label API.

---

### TC-06 — Trust Boundary Containers

**Result: FAIL**

- Two trust boundary compound nodes exist in the graph: "Physical Enclosure" and "Cloud Infrastructure" — both have `trust-boundary` class with dashed borders and correct styling.
- **However, NO asset nodes are children of these containers.** Every node has `isParent: false` and `isChild: false`. The containers are empty, appearing as invisible/collapsed elements on the canvas.
- **Root cause (Backend):** The `trust_boundaries` table has only `id`, `run_id`, `name`, and `metadata` columns. The metadata contains `boundaryType` and `crossingInterfaceNames` but **no `memberAssetIds` array**.
- The frontend code in `graphElements.ts:27` correctly reads `metadata.memberAssetIds`, but this field is never populated by the backend ingestion worker.
- **DB evidence:**
  - Physical Enclosure metadata: `{"boundaryType": "Physical", "crossingInterfaceNames": ["OCPP Gateway-CSMS Backend via LTE/WebSocket"]}`
  - Cloud Infrastructure metadata: `{"boundaryType": "Network/Logical", "crossingInterfaceNames": ["OCPP Gateway-CSMS Backend via LTE/WebSocket"]}`

**Observation:** The backend ingestion AI worker must be updated to include `memberAssetIds` in the trust boundary metadata. This is the critical missing link between trust boundaries and their member assets.

---

### TC-07 — Legend

**Result: PASS (with caveats)**

- Legend is visible in the bottom-left area of the canvas.
- Shows all 7 distinct node kinds: Cloud Service, Communication Module, Embedded Controller, HMI, Hardware Controller, Peripheral, Physical Security Controller.
- Edge label legend rows present: Protocol (sky blue swatch) and Data Classification (amber swatch).
- Legend swatches use the same `getKindColor()` function, so they match the (colliding) node colors.
- **Caveat:** Because of TC-02 color collisions, the legend shows 3 kinds with the same red swatch and 2 kinds with the same teal swatch. This undermines the legend's purpose of distinguishing kinds.

---

### TC-08 — Filter Bar

**Result: PASS**

- Typing "Gateway" in the filter bar: only "OCPP Gateway" node remains at full opacity (1.0). All other 8 nodes dim to opacity 0.15.
- Edges connected to dimmed nodes are also dimmed.
- Clearing the filter restores all nodes to full opacity.
- Graph structure (node positions, edge connections) stays intact during filtering.

---

### TC-09 — Node Click -> Detail Panel

**Result: PASS**

- Clicking "OCPP Gateway" opens the right-side detail panel showing:
  - **Header:** "OCPP Gateway" with short ID badge (`cmnjb6d2`) and "Embedded Controller" kind badge.
  - **Software Instances:** FreeRTOS v10.4 (with CPE string), OCPP Gateway Firmware vUnknown (with CPE string).
  - **Safety Functions:** "Safe management and control of DC fast charging power up to 150kW" (ASIL C), "Detection and reporting of physical tampering events" (ASIL A).
  - **No "Data Flows" section** — correctly absent per spec.
- All data matches the database records.

---

### TC-10 — Deselect on Background Click

**Result: PASS**

- Clicking a node selects it and shows detail panel.
- Clicking the canvas background deselects and returns panel to "Select a Node" placeholder state.
- No node remains highlighted after background click.

---

### TC-11 — Pan and Zoom

**Result: PASS**

- `panningEnabled: true`, `zoomingEnabled: true`, `userPanningEnabled: true`, `userZoomingEnabled: true`.
- Initial zoom level: ~0.58 (fit-to-view — graph is wider than viewport, so it zoomed out to fit).
- Zoom range: effectively unlimited (1e-50 to 1e+50).
- Pan position confirms graph is offset/fitted to canvas on load.
- Dagre layout with `rankDir: 'LR'` provides clean left-to-right layout.

---

### TC-12 — Empty / No Run State

**Result: PASS**

- Navigating to `/explorer` without a `runId` shows the correct empty state:
  - Heading: "No model generated yet"
  - Text: "Go to System Ingestion to build the system boundaries."
  - Button: "Go to System Ingestion" (navigates to `/ingestion`).
- No errors, no blank screen, no broken canvas.

---

## Summary Table

| Test Case | Description | Result |
|-----------|-------------|--------|
| TC-01 | Graph Renders | PASS |
| TC-02 | Node Colors (Hash-Derived) | FAIL — 4 unique colors for 7 kinds (3 collision groups) |
| TC-03 | Node Shapes | FAIL — All nodes `roundrectangle`, shape map doesn't match AI-generated kinds |
| TC-04 | Edge Directionality | PASS |
| TC-05 | Edge Labels (Dual Color) | PARTIAL FAIL — Both lines same sky-blue color, spec wants blue+amber |
| TC-06 | Trust Boundary Containers | FAIL — Backend never populates `memberAssetIds` in metadata |
| TC-07 | Legend | PASS (undermined by TC-02 collisions) |
| TC-08 | Filter Bar | PASS |
| TC-09 | Node Click Detail Panel | PASS |
| TC-10 | Deselect on Background Click | PASS |
| TC-11 | Pan and Zoom | PASS |
| TC-12 | Empty / No Run State | PASS |

**Overall: 8 PASS, 3 FAIL, 1 PARTIAL FAIL**

---

## Part 2: Additional Observations

### Frontend

1. **Edge label overlap on dense clusters:** The OCPP Gateway has 7 connected edges. Labels on the CANopen, USB, and Ethernet edges overlap when zoomed out. The Cytoscape `text-background-opacity: 0.8` helps but doesn't fully prevent readability issues. (Noted as acceptable limitation per spec.)

2. **Legend position (bottom-left) overlaps canvas content:** On smaller viewports the legend may cover nodes. It has no collapse/toggle mechanism.

3. **No visual indication of trust boundary containers:** Since `memberAssetIds` is empty, the two trust boundary nodes are rendered as tiny invisible elements (no children = no compound node expansion). They appear as zero-size artifacts. The frontend should either hide empty trust boundaries or show a "no members" warning.

4. **Project context switch on missing runId:** Navigating to `/explorer` without `runId` silently switched the active project from "EV Charging Station TARA" back to "Automotive ECU Test v4". This is confusing — the sidebar and system status changed without user action.

5. **Node label text truncation:** The `text-max-width: 90px` causes longer names like "Tamper Detection Module" and "Physical Security Controller" to wrap aggressively. The kind name on the second line makes labels quite tall for some nodes.

6. **No loading skeleton/spinner for the graph:** When the assets API call is in progress, there's no visual loading indicator on the Model Explorer page (the graph canvas appears empty until data loads). A brief skeleton or spinner would improve perceived performance.

### Backend

1. **Mitigations worker stuck in "running":** The pipeline run `cmnjb64g50003uf3y1007rah2` shows all steps `completed` except mitigations which has been `running` for over 5 minutes. The DB shows 51 mitigations were generated, but the step status was never updated to `completed`. The overall run status remains `running` and `completed_at` is NULL.
   - **Impact:** The Project Workspace shows "Analysis in progress" forever. The pipeline step indicator never reaches completion.
   - **Root cause likely:** The mitigations worker generates data but fails to update the run step status, possibly due to an unhandled error after data insertion or a missing status update call.

2. **Trust boundaries missing `memberAssetIds`:** The ingestion AI worker extracts trust boundary names and metadata (`boundaryType`, `crossingInterfaceNames`) but does not map which assets belong to which boundary. This is the blocking issue for TC-06. The system description clearly states membership (e.g., "Physical Enclosure: contains OCPP Gateway, Power Delivery Unit, ...") but the backend doesn't extract this into `memberAssetIds`.

3. **Orphan nodes with no data flows:** Two assets have zero edges:
   - **LTE Modem** — The system description says "The LTE Modem provides WAN connectivity for the OCPP Gateway" but no data flow was created for this relationship. The AI likely interpreted this as infrastructure rather than a data flow.
   - **Tamper Detection Module** — No explicit data flow is described in the input, but one could argue a logical connection to the OCPP Gateway should exist (tampering alerts).

4. **11 data flows vs expected ~7:** The spec expected ~7 flows but the AI generated 11. This is because bidirectional communications were extracted as separate directed edges (e.g., OCPP<->CSMS is 2 edges, OCPP<->Power Delivery is 2 edges). This is technically correct but produces a denser graph than anticipated.

5. **Software instance versions marked "Unknown":** Three software instances have `version: "Unknown"` — OCPP Gateway Firmware, CSMS Backend Application, and Billing Service Application. While the input didn't specify their versions explicitly, the "Unknown" string is rendered as "vUnknown" in the detail panel, which looks like a display artifact rather than intentional.

### Network / API

- The Model Explorer page makes exactly **3 API calls**: `/auth/profile`, `/projects`, `/runs/{runId}/assets`. This is efficient — all graph data (assets, data flows, trust boundaries, software instances, safety functions) comes from the single `/runs/{runId}/assets` endpoint.
- All requests return HTTP 200. No failed or redundant requests observed.
- No polling detected for the run status on the Model Explorer page (unlike Project Workspace which polls for pipeline progress).

### Data Validation (DB vs UI)

| Data Point | DB Count | UI/Graph Count | Match? |
|------------|----------|----------------|--------|
| Assets | 9 | 9 | Yes |
| Data Flows | 11 | 11 | Yes |
| Trust Boundaries | 2 | 2 (as nodes) | Yes (but empty containers) |
| Software Instances | 9 | Shown in detail panel | Yes (verified for OCPP Gateway: 2 instances match) |
| Safety Functions | 4 | Shown in detail panel | Yes (verified for OCPP Gateway: 2 functions match) |
| Mitigations | 51 | N/A (not on this page) | N/A |

---

## Priority Recommendations

### Critical (Blocks feature intent)
1. **Backend: Populate `memberAssetIds` in trust boundary metadata** — Without this, trust boundary containers are non-functional. The input clearly specifies membership.
2. **Backend: Fix mitigations worker completion** — The step never transitions to `completed`, leaving the run permanently in `running` state.

### High (Significant visual/functional degradation)
3. **Frontend: Improve hash color distribution** — 3 out of 7 kinds sharing red makes the graph misleading. Consider a different hash, salt, or deterministic palette assignment.
4. **Frontend: Fix shape matching logic** — Use substring/contains matching (e.g., if kind includes "gateway" -> diamond) or expand the SHAPE_MAP with more entries.

### Medium (Spec compliance)
5. **Frontend: Implement dual-colored edge labels** — Use Cytoscape `source-label`/`target-label` to separate protocol (blue) and classification (amber) colors.

### Low (Polish)
6. **Backend: Extract LTE Modem data flow** — The WAN connectivity relationship should be a data flow edge.
7. **Frontend: Hide empty trust boundary nodes** — Don't render compound nodes with zero children.
8. **Frontend: Show "vUnknown" as "Version unknown" or omit** — Better UX for missing version data.
