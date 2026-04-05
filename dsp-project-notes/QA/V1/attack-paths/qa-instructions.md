# QA — Attack Paths: Graph Diagram with Per-Edge Reasoning

## Feature Aim

The Attack Paths page should display a directed graph of how an attacker could move from an entry point to a high-value asset. Each path in the left panel represents a multi-hop exploit chain scored by feasibility. Selecting a path renders:
- A persistent **Initial Access card** above the graph describing how the attacker gains entry
- A **Cytoscape directed graph** with asset nodes connected by protocol-labeled arrows
- A **floating tooltip on edge hover** showing why that traversal is possible and what can block it

Only paths with a feasibility score above 0.7 are returned by the backend and displayed. The start node is blue, the target node is red, trust-boundary-crossing edges are dashed amber.

---

## Run Input

Use the following system description. It has explicit software versions (for CVE matching), multiple trust boundaries, and externally-exposed interfaces — conditions that should produce attack paths with feasibility > 0.7.

```
The Brake-by-Wire ECU is the central electronic control unit responsible for converting driver brake
pedal input into electromechanical brake actuation across all four wheels. It replaces the traditional
hydraulic brake system with fully electronic control.

Hardware Components:
- Main Brake ECU (ARM Cortex-R5 processor, running FreeRTOS 10.4.3)
- Brake Actuator Units (4x, one per wheel, controlled via dedicated SPI bus)
- Wheel Speed Sensors (4x, connected via analog input channels)
- Brake Pedal Position Sensor (analog input, safety-critical)
- Hardware Security Module (HSM) (embedded in Main Brake ECU for key storage and secure boot)
- Power Management Unit (regulates 12V/48V supply to ECU and actuators)
- Central Gateway (CAN gateway routing messages between vehicle subsystems)
- Telematics Control Unit (TCU) (4G/LTE connectivity, runs Linux kernel 5.10 and OpenSSL 3.0.9)
- Cloud Backend (OTA update server and telemetry endpoint)
- Infotainment Head Unit (touch display, CAN-connected to gateway)

Software:
- FreeRTOS 10.4.3 on Main Brake ECU
- Linux Kernel 5.10 on TCU
- OpenSSL 3.0.9 on TCU

Interfaces:
- CAN bus between Central Gateway and Main Brake ECU (safety-critical brake commands)
- CAN bus between Main Brake ECU and Central Gateway (telemetry)
- SPI bus between Main Brake ECU and Brake Actuator Units
- Analog input from Brake Pedal Position Sensor to Main Brake ECU
- Analog input from Wheel Speed Sensors to Main Brake ECU
- Ethernet between TCU and Central Gateway (OTA, configuration)
- 4G/LTE between TCU and Cloud Backend (telemetry, OTA)
- OBD-II diagnostic port on Main Brake ECU (CAN-based, accessible from vehicle interior)
- CAN bus between Central Gateway and Infotainment Head Unit

Trust Boundaries:
- Vehicle Internal Network Boundary: crossed by the 4G/LTE interface (TCU ↔ Cloud Backend) and the OBD-II diagnostic port
- Gateway Firewall Boundary: crossed by the CAN interface (Gateway ↔ Brake ECU) and Ethernet (TCU ↔ Gateway)
- ECU Secure Boot Boundary: enforced by the HSM on the Main Brake ECU firmware load path
```

---

## Expected Overall Output

After the full pipeline completes for this run:

**Attack paths (approx.):** At least 3–5 paths with feasibility > 0.7. Expected paths include:
- TCU (via 4G/LTE exploit) → Central Gateway → Main Brake ECU
- OBD-II Diagnostic Port → Main Brake ECU
- Cloud Backend → TCU → Central Gateway → Main Brake ECU

Each path should have `initialAccessDescription` populated and per-hop `edgeReasoning` / `edgeMitigation` on all edges except the first hop.

**Trust boundary crossings:** The 4G/LTE edge (TCU ↔ Cloud Backend) and the OBD-II → Brake ECU edge should render as dashed amber arrows.

---

## Test Cases

### TC-01 — Paths Are Generated (Pipeline Fix Verification)

**What to check:** The attack paths step completes with at least one path stored, confirming the threat entry-point resolution fix is working end-to-end.

**How:** After the run completes, navigate to the Attack Paths page with the run selected. The left panel should show a non-empty list of paths.

**Pass:** At least one path card appears in the list. The run's `steps.attack_paths` field shows `"completed"` (visible in the Run History page or via API).

**Fail:** Zero paths shown. If zero, check the DB — if `threat_entry_points` table has 0 rows for this run, the upstream bug fix did not land correctly.

---

### TC-02 — List Cards Show Asset Names, Not IDs

**What to check:** Each path card in the left panel shows human-readable asset names for both the start and target, not raw database IDs (cuid strings like `cmn...`).

**How:** Inspect the path cards in the left panel. The "start → target" line should read something like "Telematics Control Unit (TCU) → Main Brake ECU", not "cmnj5ilky... → cmnht0u...".

**Pass:** Both start and target display recognisable asset names on every card.

**Fail:** Either field shows a cuid-format string.

---

### TC-03 — Only High-Confidence Paths Shown

**What to check:** All paths displayed have a feasibility score above 0.7. No low-confidence paths appear.

**How:** Inspect the `Fr:` value on each card in the left panel. All values should be > 0.70.

**Pass:** Every visible card has `Fr: > 0.70`.

**Fail:** Any card shows `Fr: ≤ 0.70`.

---

### TC-04 — Selecting a Path Renders the Graph

**What to check:** Clicking a path card replaces the empty-state placeholder in the right panel with a Cytoscape graph containing nodes and directed edges.

**How:** Click any path card. The right panel should transition from the "Select highly probable attack path" placeholder to a rendered graph.

**Pass:** Graph canvas is visible with nodes and arrows. No blank canvas, no spinner.

---

### TC-05 — Initial Access Card Appears Above Graph

**What to check:** An amber-tinted "Initial Access" card is visible above the graph canvas, containing a sentence or two describing how the attacker gains entry at the start node.

**How:** After selecting a path, look above the graph canvas. The card should have a lock emoji prefix and the heading "Initial Access".

**Pass:** Card is present. Text is meaningful (not null, not empty, not a placeholder string). Card is always visible — does not require any hover or interaction to see.

**Fail:** Card is absent, shows no text, or shows a raw `null` / `undefined` value.

---

### TC-06 — Graph Nodes: Start Node Blue, Target Node Red

**What to check:** The entry-point node renders in blue and the target (final) asset renders in red. All intermediate nodes render in a neutral gray/white.

**How:** Inspect the graph. The leftmost node (or wherever the layout places the entry) should be visually blue-tinted. The final node should be red-tinted.

**Pass:** Start node = blue border and background. Target node = red border and background. Other nodes = neutral.

**Fail:** All nodes are the same color, or colors are reversed.

---

### TC-07 — Edge Labels Show Protocol

**What to check:** Each arrow in the graph displays the communication protocol used for that hop (e.g. "CAN", "4G/LTE", "Ethernet").

**How:** Zoom into the graph. Each edge should have a short text label on or near it.

**Pass:** At least 2 edges have visible protocol labels. Labels contain protocol names, not IDs or empty strings.

**Fail:** No edge labels visible, or labels show raw asset IDs.

---

### TC-08 — Trust Boundary Crossings Render as Dashed Amber Edges

**What to check:** Edges that cross a trust boundary are rendered as dashed amber/yellow arrows, visually distinct from normal edges.

**How:** Select a path that crosses at least one trust boundary (check `trustBoundaryCrossings > 0` on the list card). In the graph, identify any edge that goes between a node inside the vehicle network and one outside (e.g. TCU → Cloud Backend, or OBD-II → Brake ECU). That edge should be dashed and amber-colored.

**Pass:** At least one dashed amber edge visible on a path with `trustBoundaryCrossings > 0`. Normal edges remain solid gray.

**Fail:** All edges are solid gray regardless of trust boundary crossing status, or the `trustBoundaryCrossings` count on the list card is 0 for all paths (which would indicate the trust boundary fix did not land).

---

### TC-09 — Edge Hover: Tooltip Appears with Reasoning and Mitigation

**What to check:** Hovering the mouse over an arrow in the graph shows a floating tooltip with two sections: "Why possible" and "How to block it".

**How:** Hover over any edge (arrow) in the graph. A floating white card should appear near the cursor. It should contain two labelled sections.

**Pass:** Tooltip appears on hover. "Why possible" section has non-empty text explaining the protocol or architectural weakness. "How to block it" section has a specific control recommendation (not a generic sentence). Tooltip disappears when cursor leaves the edge.

**Fail:** No tooltip appears. Either section is empty or missing. Tooltip stays on screen after cursor moves away.

---

### TC-10 — Edge Hover: First Hop Has No Tooltip (No Incoming Edge on Start Node)

**What to check:** The start node has no incoming edge, so hop 1 carries no `edgeReasoning` / `edgeMitigation`. There is no arrow pointing *into* the start node — hovering over the canvas near the start node should not show a tooltip.

**How:** Observe the start node in the graph. Confirm no arrow leads into it from the left. Hover around the start node — no tooltip should appear.

**Pass:** Start node has no incoming edge. No spurious tooltip appears.

---

### TC-11 — Switching Between Paths Updates the Graph

**What to check:** Selecting a different path in the left panel replaces the current graph with a fresh one for the newly selected path, including a different initial access card and different nodes/edges.

**How:** Select path A, note its nodes and initial access text. Select path B. Graph and initial access card should update to reflect path B.

**Pass:** Graph changes. Initial access text changes. No stale content from path A persists.

---

### TC-12 — Search Filters the List Panel

**What to check:** Typing in the search input filters the path list to show only paths whose start or target asset name contains the search term.

**How:** Type "Brake" in the search box. Only paths where the start or target is the "Main Brake ECU" (or similar) should remain visible. Clear the search — all paths return.

**Pass:** List reduces on search. Clears correctly. Search is case-insensitive.

**Fail:** Search has no effect, or removes all paths including matching ones.

---

### TC-13 — Zero Paths Empty State

**What to check:** If a run completes the attack_paths step but produces zero paths above the 0.7 threshold, a specific empty state is shown (not a blank panel or a generic error).

**How:** This is harder to trigger on the standard input — optionally run a new project with a minimal or highly-secured system description that is unlikely to produce high-feasibility paths. If zero paths are returned, the left panel should show a message explaining that no high-confidence paths were found.

**Pass:** Empty state message appears. It references the 0.7 threshold or the absence of credible chains. No broken layout or console errors.

---

### TC-14 — No Run Selected Empty State

**What to check:** Navigating to the Attack Paths page without a `runId` in the URL shows the correct full-page empty state (not a graph canvas or JS error).

**How:** Navigate to `/attack-paths` with no query params.

**Pass:** Full-page empty state shown with a call-to-action pointing to Threat Generation. No graph attempts to render.

---

## Known Acceptable Limitations for This Iteration

- On runs created before this iteration landed, attack paths will be absent. Do not test against old runs.
- The Cytoscape layout may overlap node labels on long asset names — this is a cosmetic issue and not a blocker.
- The tooltip position may clip near the edge of the right panel if the hovered edge is in a corner — acceptable for iteration 1.
- Paths on very small systems (fewer than 3 assets) may not produce any paths above 0.7 — this is expected behaviour, not a bug.
