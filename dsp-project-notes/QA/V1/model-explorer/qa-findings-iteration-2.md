# QA Findings — Model Explorer: Iteration 2 Retest

**Date:** 2026-04-04
**Run ID:** `cmnjxeons0004ufofbqvry7mo`
**Project:** EV Charging Station TARA
**Tester:** Claude (QA Agent)
**Baseline:** qa-findings-iteration-1.md

---

## Part 1: Test Case Results

### TC-01 — Graph Renders

**Result: PASS**

- Canvas renders a Cytoscape graph (1060px wide).
- 9 asset nodes visible, 14 edges rendered.
- Header displays "9 assets - 14 data flows".
- Zero console errors, zero warnings.

**Change from Iteration 1:** Edge count increased from 11 to 14. New bidirectional flows added for Tamper Detection Module (2 edges) and RFID Reader (1 reverse edge).

---

### TC-02 — Node Colors Are Hash-Derived, Not Hardcoded

**Result: PASS (FIXED)**

- Color assignment changed from hash-based (`djb2`) to **sequential first-seen assignment** (`assignKindColors()`). Each kind gets the next palette color in order — zero collisions guaranteed for up to 10 kinds.
- **6 unique colors for 6 distinct kinds:**
  - ECU: `#3b82f6` (blue)
  - HardwareController: `#22c55e` (green)
  - Peripheral: `#f97316` (orange)
  - HMI: `#a855f7` (purple)
  - CommunicationModule: `#0ea5e9` (sky)
  - CloudService: `#ef4444` (red)
- No collisions. Power Delivery Unit and Tamper Detection Module share green because they share the kind `HardwareController` — this is correct behavior.

**Iteration 1 issue (3 collision groups) — RESOLVED.**

---

### TC-03 — Node Shapes

**Result: FAIL (NOT FIXED)**

- All 9 asset nodes still render as `roundrectangle`.
- `getKindShape()` was updated to use `.includes()` substring matching instead of exact match. It now checks if `kind.toLowerCase()` includes "sensor", "gateway", or "actuator".
- **However**, the AI-generated kinds changed from iteration 1. "Embedded Controller" is now "ECU" — neither "Embedded Controller" nor "ECU" contains "gateway". The OCPP Gateway (which is conceptually a gateway) has kind "ECU", which doesn't trigger the diamond shape.
- The kind strings are: ECU, HardwareController, Peripheral, HMI, CommunicationModule, CloudService. None of these contain "sensor", "gateway", or "actuator".
- **Root cause:** The shape-matching keywords don't align with the AI-generated kind vocabulary. The `.includes()` fix was the right direction but insufficient — the SHAPE_MAP keywords need to match what the AI actually produces (e.g., "ecu", "controller", "cloud", "hmi").

---

### TC-04 — Edge Directionality

**Result: PASS**

- All 14 edges have `target-arrow-shape: "triangle"` and `source-arrow-shape: "none"`.
- Correct directed edges for all communication flows.

---

### TC-05 — Edge Labels (Protocol + Data Classification)

**Result: PASS (FIXED)**

- Edge labels are now rendered as **React HTML overlays** (not Cytoscape native labels).
- Each edge shows two lines at its midpoint:
  - Line 1: Protocol in sky blue `rgb(14, 165, 233)` / `#0ea5e9`
  - Line 2: Data Classification in amber `rgb(234, 179, 8)` / `#eab308`
- Verified on 14 edges — all have dual-colored labels.
- Labels scale with zoom (`font-size: 10 * zoom px`).
- Overlay updates on `layoutstop` and `viewport` events.

**Iteration 1 issue (single-color labels) — RESOLVED.**

---

### TC-06 — Trust Boundary Containers

**Result: FAIL (PARTIALLY FIXED — backend data present but API strips metadata)**

- **Backend (FIXED):** The `trust_boundaries` table now contains `memberAssetIds` in metadata:
  - Physical Enclosure: 6 member IDs (OCPP Gateway, PDU, Tamper Detection, RFID Reader, HIP, LTE Modem)
  - Cloud Infrastructure: 3 member IDs (CSMS Backend, Billing Service, Firmware Update Server)
- **API (BUG):** The `GET /runs/:runId/assets` endpoint returns trust boundaries with only `{id, runId, name}` — the `metadata` field is **missing from the API response** despite being selected by the Prisma query (`select: { metadata: true }`).
  - The OpenAPI schema defines `metadata` as an optional property on `TrustBoundary` (not in `required`). However, something in the serialization chain is stripping it. The service layer returns metadata, but by the time it reaches the client, metadata is gone.
- **Frontend (CORRECT):** `graphElements.ts` correctly reads `tb.metadata.memberAssetIds` and sets `parent` on asset nodes. It also correctly skips trust boundaries with empty `memberAssetIds`. Since the API returns no metadata, `memberAssetIds` is always `[]`, so all trust boundaries are skipped.
- **Result:** Zero trust boundary compound nodes rendered. No asset nodes have a `parent` property.

**Iteration 1 issue (backend not populating memberAssetIds) — PARTIALLY FIXED.** The ingestion worker now extracts memberAssetIds correctly, but the API serialization strips the metadata field before it reaches the frontend.

---

### TC-07 — Legend

**Result: PASS**

- Legend is now positioned at **top-right** (changed from bottom-left in iteration 1).
- Shows all 6 distinct node kinds: ECU, HardwareController, Peripheral, HMI, CommunicationModule, CloudService.
- Edge label legend rows present: Protocol (sky blue swatch) and Data Classification (amber swatch).
- Color swatches match rendered node colors (no collision confusion this time).
- Legend uses the `kindColorMap` from `assignKindColors()` — guaranteed match.

---

### TC-08 — Filter Bar

**Result: PASS**

- Typing "Gateway" in the filter bar: only "OCPP Gateway" remains at full opacity. All other 8 nodes dim (opacity 0.15).
- Filter now matches both **name** and **kind** (improved from iteration 1 which matched name/kind implicitly through the label).
- Edge label overlays also dim along with their connected dimmed nodes.
- Clearing the filter restores all nodes to full opacity.

---

### TC-09 — Node Click -> Detail Panel

**Result: PASS**

- Clicking "OCPP Gateway" opens the right-side detail panel showing:
  - **Header:** "OCPP Gateway" with "ECU" kind badge (changed from "Embedded Controller" in iteration 1).
  - **Software Instances:** FreeRTOS v10.4 (with CPE), OCPP Application v* (with CPE).
  - **Safety Functions:** 3 listed — "Safe control of 150kW DC fast charging" (ASIL D), "Secure and validated OTA firmware update" (ASIL B), "Physical security breach detection" (ASIL A).
  - **No "Data Flows" section** — correctly absent.
- Node label now shows **name only** on the canvas (not name + kind). Kind is rendered as an HTML overlay above the node — cleaner visual separation.

---

### TC-10 — Deselect on Background Click

**Result: PASS**

- Clicking canvas background deselects node and returns panel to "Select a Node" placeholder.

---

### TC-11 — Pan and Zoom

**Result: PASS**

- Zoom, pan, user zoom, and user pan all enabled.
- Initial zoom: ~0.44 (fit-to-view for a wider graph with 14 edges).
- Dagre layout with increased spacing: `nodeSep: 160`, `rankSep: 300`, `padding: 80` (up from 60/120/40 in iteration 1) — significantly less visual clutter.
- Edge label overlays reposition correctly on pan/zoom (via `viewport` event handler).

---

### TC-12 — Empty / No Run State

**Result: PASS**

- Navigating to `/explorer` without a `runId` shows "No model generated yet" with "Go to System Ingestion" button.
- No errors or blank screen.

---

## Summary Table

| Test Case | Description | Iteration 1 | Iteration 2 | Delta |
|-----------|-------------|-------------|-------------|-------|
| TC-01 | Graph Renders | PASS | PASS | -- |
| TC-02 | Node Colors | FAIL | **PASS** | FIXED |
| TC-03 | Node Shapes | FAIL | FAIL | NOT FIXED |
| TC-04 | Edge Directionality | PASS | PASS | -- |
| TC-05 | Edge Labels (Dual Color) | PARTIAL FAIL | **PASS** | FIXED |
| TC-06 | Trust Boundary Containers | FAIL | FAIL | PARTIALLY FIXED (data present, API strips it) |
| TC-07 | Legend | PASS | PASS | Improved (position, color accuracy) |
| TC-08 | Filter Bar | PASS | PASS | -- |
| TC-09 | Node Click Detail Panel | PASS | PASS | -- |
| TC-10 | Deselect on Background Click | PASS | PASS | -- |
| TC-11 | Pan and Zoom | PASS | PASS | Improved (spacing, overlay repositioning) |
| TC-12 | Empty / No Run State | PASS | PASS | -- |

**Overall: 10 PASS, 2 FAIL (down from 8 PASS, 3 FAIL, 1 PARTIAL FAIL)**

---

## Part 2: Additional Observations

### Frontend

1. **Node kind labels rendered as HTML overlays above nodes:** The kind text (e.g., "ECU", "CloudService") is now positioned above each node via the React overlay system. This is cleaner than the old approach of embedding kind in the Cytoscape label. However, at low zoom levels (current default ~0.44), the overlay font size becomes very small (`9 * 0.44 = ~4px`), making kind labels essentially unreadable until zoomed in.

2. **Edge label overlays don't render on initial load:** The overlay container starts empty (0 children). Labels only appear after a `viewport` event is emitted (e.g., pan/zoom). On first page load, the graph shows no edge labels until the user interacts. This is because `layoutstop` fires before the overlay ref is attached. A manual `updateOverlay()` call after mount/layout would fix this.

3. **Layout spacing greatly improved:** `nodeSep: 160`, `rankSep: 300`, `padding: 80` provides much more breathing room between nodes and reduces edge label overlap. This is a significant visual improvement.

4. **Project context doesn't follow runId:** Navigating to `/explorer?runId=cmnjxeons0004ufofbqvry7mo` loads the graph correctly, but the sidebar still shows "Automotive ECU Test v4" instead of "EV Charging Station TARA". The project context doesn't sync from the run's project. The sidebar nav links also don't include the `runId` parameter.

5. **Legend moved to top-right:** In iteration 1 it was bottom-left, now top-right. This avoids overlap with the graph content area. Good change.

6. **Console error on project switch:** Switching projects triggers a 404 on `GET /users/me/active-project` and an `ApiError`. This endpoint doesn't exist. The feature to persist active project appears to be partially implemented.

### Backend

1. **Trust boundary `metadata` stripped from API response (CRITICAL):** The Prisma query in `assets.service.ts:40` selects `metadata: true`, and the DB stores `memberAssetIds` correctly. But the API response only returns `{id, runId, name}`. Possible causes:
   - Fastify response serialization might strip fields not in a response schema (if `@fastify/swagger` auto-generates one from the OpenAPI spec).
   - The `metadata` field is `["object", "null"]` in the OpenAPI schema but not `required` — Fastify's fast-json-stringify may exclude optional fields that are `null` or have complex types.
   - The Prisma JSON field might serialize to `null` in some edge case despite containing data.
   
   **This is the sole remaining blocker for TC-06.** The fix is likely adding `metadata` to the response or checking why Fastify serialization drops it.

2. **Mitigations worker still gets stuck:** The pipeline run hung on the `attack_paths` step for 5+ minutes. The BullMQ worker process exited cleanly (exit code 0) before completing all steps. When restarted, the stalled active job wasn't re-picked. This suggests the worker process has a graceful shutdown that doesn't wait for in-flight LLM API calls to complete, or there's a timeout killing long-running jobs.

3. **Worker must be started separately:** The BullMQ worker (`npx tsx src/worker.ts`) must be started as a separate process from the HTTP server. If the worker isn't running, new runs stay in `queued` state indefinitely with no user-facing error. The previous run from the first session had this problem — the worker wasn't running when the test started.

4. **Asset kinds changed from iteration 1:** The AI ingestion now produces PascalCase single-word kinds (ECU, HardwareController, CloudService, CommunicationModule, HMI, Peripheral) instead of the previous space-separated kinds (Embedded Controller, Hardware Controller, Cloud Service, Communication Module). This is a semantic change that affects the shape mapping.

5. **LTE Modem still has zero edges:** The system description says "The LTE Modem provides WAN connectivity for the OCPP Gateway" but no data flow is created. Still an orphan node.

6. **14 data flows (up from 11):** New bidirectional flows added for:
   - Tamper Detection Module <-> OCPP Gateway (CANopen: Security/Alert and Control)
   - RFID Reader <- OCPP Gateway (USB: Control — reverse direction)
   These are improvements over iteration 1, where Tamper Detection Module had zero edges.

### Network / API

- Model Explorer page makes **3 API calls**: `/auth/profile`, `/projects`, `/runs/{runId}/assets` — same as iteration 1, efficient.
- All requests return HTTP 200.
- The `/users/me/active-project` 404 error fires on project switch (not on Model Explorer navigation).

### Data Validation (DB vs UI vs API)

| Data Point | DB Count | API Response | UI/Graph | Match? |
|------------|----------|-------------|----------|--------|
| Assets | 9 | 9 | 9 nodes | Yes |
| Data Flows | 14 | 14 | 14 edges | Yes |
| Trust Boundaries | 2 (with memberAssetIds) | 2 (WITHOUT metadata) | 0 compound nodes | **No** — API strips metadata |
| Software Instances | 9 | Included in AssetDetail | Shown in panel | Yes |
| Safety Functions | 6 | Included in AssetDetail | Shown in panel | Yes |

---

## Priority Recommendations

### Critical (Blocks feature intent)
1. **Backend: Fix trust boundary `metadata` serialization in API response.** The DB has `memberAssetIds` — it just needs to reach the frontend. Check if Fastify response serialization, `@fastify/swagger`, or `fast-json-stringify` is stripping the optional `metadata` field. This is the last blocker for trust boundary containers.

### High (Significant functional gap)
2. **Frontend: Fix shape matching for AI-generated kinds.** The SHAPE_MAP keywords ("sensor", "gateway", "actuator") don't match any current AI-generated kind strings. Options:
   - Expand keywords: add "ecu" -> diamond, "controller" -> hexagon, "cloud" -> roundrectangle, "hmi" -> ellipse, etc.
   - Or instruct the AI ingestion to include canonical shape-hint kinds.

### Medium (UX polish)
3. **Frontend: Trigger `updateOverlay()` after initial layout.** Edge labels don't appear until the first user interaction (pan/zoom). Add a `requestAnimationFrame(updateOverlay)` call after layout completes.
4. **Backend: Fix worker reliability.** The worker exits before completing all steps when LLM API calls take too long. Add keepalive/timeout configuration for the BullMQ worker to prevent premature exit.

### Low (Minor)
5. **Backend: Extract LTE Modem data flow.** Still an orphan with zero edges.
6. **Frontend: Kind overlay font size too small at default zoom.** At zoom ~0.44, kind labels are ~4px — unreadable. Consider a minimum font size floor.
7. **Backend: Implement or remove `/users/me/active-project` endpoint.** Currently 404s on project switch.

---

## Iteration 1 vs Iteration 2 Comparison

| Issue | Iteration 1 | Iteration 2 | Status |
|-------|-------------|-------------|--------|
| Color hash collisions (3 groups) | 4 unique colors / 7 kinds | 6 unique colors / 6 kinds | **FIXED** |
| Edge labels single-color | All sky-blue | Protocol=sky, Classification=amber (React overlay) | **FIXED** |
| Trust boundaries empty | Backend missing memberAssetIds | Backend has memberAssetIds, API strips metadata | **PARTIALLY FIXED** |
| Node shapes all roundrectangle | Exact-match SHAPE_MAP | .includes() match, but kinds still don't match | **NOT FIXED** |
| Mitigations worker stuck | Never completed | Still unreliable, worker exits mid-pipeline | **NOT FIXED** |
| LTE Modem orphan node | 0 edges | 0 edges | **NOT FIXED** |
| Tamper Detection orphan | 0 edges | 2 edges (CANopen) | **FIXED** |
| Layout spacing tight | nodeSep=60, rankSep=120 | nodeSep=160, rankSep=300 | **IMPROVED** |
| Legend position | Bottom-left | Top-right | **IMPROVED** |
| Node labels | Name + Kind in Cytoscape | Name in Cytoscape, Kind as HTML overlay | **IMPROVED** |
