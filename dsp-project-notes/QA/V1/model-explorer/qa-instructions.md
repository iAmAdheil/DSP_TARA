# QA — Model Explorer: Interactive Graph View

## Feature Aim

The Model Explorer page should display the system architecture as an interactive directed graph. Components are nodes, data flows are directional arrows. Node color is computed from the component kind using a hash function (not hardcoded). Trust boundaries are rendered as compound containers grouping their member nodes. Clicking a node opens a detail panel.

---

## Run Input

Use the following system description as the input artifact when creating a test run. It is intentionally designed to produce a variety of asset kinds — including unusual ones — to stress-test the hash-based color assignment.

```
The EV Charging Station Management System consists of the following components:

Hardware:
- OCPP Gateway (custom embedded controller, ARM Cortex-M4, running FreeRTOS 10.4)
- Power Delivery Unit (hardware controller managing up to 150kW DC fast charging)
- Tamper Detection Module (physical security controller with secure enclave)
- RFID Reader (NFC/RFID card authentication peripheral)
- Human Interface Panel (touchscreen display, Linux 5.15, runs Qt 6.2 UI)
- LTE Modem (Sierra Wireless EM9190, firmware v1.4.2)

Cloud/Backend:
- CSMS Backend (Charge Station Management System, Node.js 18, hosted on AWS)
- Billing Service (processes payment authorisation, PCI-DSS compliant)
- Firmware Update Server (serves signed OTA firmware images)

Communication:
- The OCPP Gateway communicates with CSMS Backend over OCPP 1.6J via WebSocket over LTE
- The OCPP Gateway connects to the Power Delivery Unit over a proprietary CANopen bus
- The RFID Reader connects to the OCPP Gateway over USB
- The Human Interface Panel connects to the OCPP Gateway over Ethernet
- The LTE Modem provides WAN connectivity for the OCPP Gateway
- The CSMS Backend communicates with the Billing Service over internal REST API (TLS)
- The Firmware Update Server is accessed by the OCPP Gateway over HTTPS for OTA updates

Trust Boundaries:
- Physical Enclosure: contains OCPP Gateway, Power Delivery Unit, Tamper Detection Module, RFID Reader, Human Interface Panel, LTE Modem
- Cloud Infrastructure: contains CSMS Backend, Billing Service, Firmware Update Server
- The LTE/WebSocket link crosses the boundary between Physical Enclosure and Cloud Infrastructure
```

---

## Expected Overall Output

After ingestion completes, navigating to the Model Explorer for this run should produce:

**Nodes (approx.):** ~9 assets — OCPP Gateway, Power Delivery Unit, Tamper Detection Module, RFID Reader, Human Interface Panel, LTE Modem, CSMS Backend, Billing Service, Firmware Update Server

**Edges (approx.):** ~7 directed data flows with protocol and data classification labels on each

**Trust Boundaries:** 2 containers — "Physical Enclosure" grouping the 6 on-device components, "Cloud Infrastructure" grouping the 3 backend components

---

## Test Cases

### TC-01 — Graph Renders

**What to check:** The canvas is not blank. Nodes and edges are visible after the run completes ingestion.

**How:** Navigate to Model Explorer with the test run selected. The canvas should show a populated graph, not a loading spinner or empty state.

**Pass:** Nodes visible, edges visible, no console errors.

---

### TC-02 — Node Colors Are Hash-Derived, Not Hardcoded

**What to check:** Each distinct asset kind has a consistent color. Unusual kinds (e.g. "Tamper Detection Module", "Power Delivery Unit") still get a color — they should not fall back to a single default gray.

**How:** Observe the node colors. Note the kinds present. Run `getKindColor('OCPP Gateway')` and `getKindColor('Billing Service')` in the browser console — confirm the returned hex matches what is rendered.

**Pass:** Every node has a color. No two nodes with different kinds have the same color (within a 10-node graph, hash collisions are possible but unlikely — flag if more than 2 collisions exist). Console call matches rendered color.

---

### TC-03 — Node Shapes

**What to check:** Known kinds render the correct Cytoscape shape. Unknown kinds fall back to `roundrectangle`.

**How:** Visually inspect:
- Any "sensor"-kind node → ellipse
- Any "gateway"-kind node → diamond
- Any "actuator"-kind node → hexagon
- All other kinds → rounded rectangle

**Pass:** Shapes match the spec table. No node is rendered as a plain square/circle when it shouldn't be.

---

### TC-04 — Edge Directionality

**What to check:** All edges have an arrowhead at the target end, indicating direction of data flow.

**How:** Inspect edges on the canvas. Each line should have a visible triangle arrow at one end.

**Pass:** All edges have arrowheads. No edge is bidirectional (double-headed arrow) unless the underlying data explicitly has two flows in both directions.

---

### TC-05 — Edge Labels (Protocol + Data Classification)

**What to check:** Each edge displays two lines of text — the protocol on line 1 and the data classification on line 2, in different colors.

**How:** Zoom in on an edge. Confirm two lines of label text are visible. Protocol should appear in a sky/blue color, data classification in amber.

**Pass:** Both lines present on at least 3 edges checked. Colors are visually distinct (blue vs amber).

---

### TC-06 — Trust Boundary Containers

**What to check:** "Physical Enclosure" and "Cloud Infrastructure" render as labeled background containers. The correct nodes sit inside each container.

**How:** Visually confirm the two boundary rectangles are present with labels. Confirm the 6 physical nodes are inside "Physical Enclosure" and the 3 backend nodes are inside "Cloud Infrastructure".

**Pass:** Both containers visible. All member nodes sit inside their respective container. No node sits inside the wrong container.

---

### TC-07 — Legend

**What to check:** A legend panel is visible on the canvas showing all asset kinds present in the run, each with the correct color swatch. Edge label legend rows (Protocol, Data Classification) are also present.

**How:** Locate the legend (bottom-left of canvas). Count the kind rows — should match the number of distinct kinds in the graph. Check that color swatches match the node colors.

**Pass:** Legend present. Kind count matches. Swatch colors match node colors. Protocol and Data Classification rows present.

---

### TC-08 — Filter Bar

**What to check:** Typing in the filter bar dims non-matching nodes without removing them from the graph. The graph structure stays intact.

**How:** Type "Gateway" in the filter bar. Nodes with "Gateway" in name or kind should remain fully visible. All other nodes should dim significantly (low opacity). Clear the filter — all nodes return to full opacity.

**Pass:** Matching nodes remain bright. Non-matching nodes dim. Graph edges remain visible (also dimmed). Clearing restores full opacity for all elements.

---

### TC-09 — Node Click → Detail Panel

**What to check:** Clicking a node opens the right-side detail panel with correct content.

**How:** Click the "OCPP Gateway" node (or equivalent). Panel should show:
- Header: asset name + kind badge
- Software Instances section (if any were extracted)
- Safety Functions section (if any were extracted)
- **No "Data Flows" section** — this has been removed

**Pass:** Panel opens. Name and kind correct. Data Flows section is absent. If no software or safety functions, shows "No additional details available."

---

### TC-10 — Deselect on Background Click

**What to check:** Clicking the canvas background (not a node) deselects the current node and resets the detail panel.

**How:** Click a node to select it. Then click an empty area of the canvas. Panel should return to the "Select a Node" placeholder state.

**Pass:** Panel shows placeholder after background click. No node remains highlighted.

---

### TC-11 — Pan and Zoom

**What to check:** The graph can be panned by click-and-drag and zoomed by scroll wheel. The graph fits the canvas on initial load.

**How:** On page load, confirm the full graph is visible (fit-to-view). Then scroll to zoom in. Then click-drag to pan.

**Pass:** Fit-to-view on load. Zoom and pan both functional. No elements disappear or overlap unexpectedly at different zoom levels.

---

### TC-12 — Empty / No Run State

**What to check:** When no run is selected, the page shows the correct empty state (not a broken graph canvas).

**How:** Navigate to Model Explorer without a `runId` in the URL.

**Pass:** Empty state UI is shown ("No model generated yet" with a link to System Ingestion). No errors or blank screen.

---

## Known Acceptable Limitations for This Iteration

- Trust boundary containers may not appear if the ingestion AI did not extract `memberAssetIds` for a run created before the backend change landed — this is expected for old runs only
- Hash collisions (two different kinds getting the same color) are possible but unlikely with ≤10 nodes — flag only if it causes confusion, not as a hard failure
- Edge label text may overlap on dense graphs — noted, not a blocker for this iteration
