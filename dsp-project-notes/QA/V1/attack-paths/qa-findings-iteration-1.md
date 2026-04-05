# QA Findings — Attack Paths: Iteration 1

**Run tested:** `cmnlfq3vc000eufvlihdmcrrn` (Project: Brake-by-Wire ECU — Attack Paths QA)  
**Date:** 2026-04-05  
**Tester:** QA Agent (Playwright + psql)  
**Input:** Brake-by-Wire ECU system description (full spec from qa-instructions.md)

---

## TC Results

### TC-01 — Paths Are Generated ✅ PASS

248 paths were generated and shown in the left panel. The `steps.attack_paths` field shows `completed`. The list is non-empty and paths are displayed correctly as cards.

**Observation:** 248 paths is far above the expected 3–5. The BFS is enumerating all paths for each of 49 threats, producing a large number of redundant paths between the same (start, target) pairs via different threats. A deduplication pass on `(startSurface, targetAssetId, steps)` would make this more manageable.

---

### TC-02 — List Cards Show Asset Names, Not IDs ❌ FAIL

**Result:** Start node displays "—" on every single card. Target asset names display correctly.

**Root cause (backend):** The `AttackPathsService.getByRunId()` does correctly resolve `startSurface → startAsset` via a secondary `prisma.asset.findMany` lookup and adds it to the returned object. However, `startAsset` is completely absent from the final JSON response (confirmed via `jq 'has("startAsset")'` → `false`). The `targetAsset` is present because it is included via Prisma's `include` clause, not added manually. Likely cause: Fastify or the response pipeline strips properties that are not part of the Prisma model type, even without an explicit response schema. The manual spread `{ ...p, startAsset: ... }` may not survive serialization.

**Frontend code (correct):** `path.startAsset?.name ?? '—'` — this correctly falls back to `'—'` when `startAsset` is null/absent.

---

### TC-03 — Only High-Confidence Paths Shown ❌ FAIL

**Result:** 58 of the 248 stored paths have `feasibility_score ≤ 0.7`, including paths with scores 0.70, 0.65, 0.60, 0.55, 0.50, 0.40, 0.35, 0.25. All 248 are returned by the API and rendered in the UI.

**Distribution from DB:**
```
1.00 → 1 path
0.95 → 13 paths
0.90 → 69 paths
0.88 → 2 paths
0.85 → 31 paths
0.80 → 55 paths
0.75 → 19 paths
0.70 → 29 paths  ← should be excluded (≤ 0.7)
0.65 → 3 paths   ← should be excluded
0.60 → 13 paths  ← should be excluded
0.55 → 1 path    ← should be excluded
0.50 → 4 paths   ← should be excluded
0.40 → 5 paths   ← should be excluded
0.35 → 2 paths   ← should be excluded
0.25 → 1 path    ← should be excluded
```

**Root cause (backend):** The worker filter `if (evaluation.feasibilityScore <= 0.7) continue` should exclude paths at or below 0.7. The 29 paths with score exactly 0.70 are likely cases where the LLM returned `0.700000001` (just above the threshold) which gets stored as `0.70` by PostgreSQL's double precision rounding. The paths at 0.65 and below are harder to explain — the filter should be catching them. Possible cause: the worker running at pipeline time was an older version without the threshold filter.

---

### TC-04 — Selecting a Path Renders the Graph ✅ PASS

**Result:** Clicking any path card replaces the empty-state placeholder with a Cytoscape canvas containing nodes and directed edges. Graph is visible and interactive.

**Caveat:** The Cytoscape canvas uses three stacked canvas layers (background, node, UI). The content layer is `canvas[2]` (index 2), not `canvas[0]`. This is standard Cytoscape behavior and not a bug.

---

### TC-05 — Initial Access Card Appears Above Graph ❌ FAIL

**Result:** No Initial Access card appears for any of the 248 paths. The card is conditionally rendered only when `selectedPath.initialAccessDescription` is non-null, but this field is `null` for every path in the database (confirmed: `COUNT(initial_access_description IS NOT NULL) = 0`).

**Root cause (backend):** The LLM enrichment step in the attack paths worker failed to populate `initialAccessDescription` for any path. From the DB, `initial_access_description` is `NULL` for all 248 rows despite the column existing and the Prisma write including it. The Gemini structured output likely returned empty/null for this field.

---

### TC-06 — Graph Nodes: Start Node Blue, Target Node Red ✅ PASS

**Result:** Verified via canvas pixel sampling and direct Cytoscape data inspection:
- Start node (Main Brake ECU): blue border (#3b82f6), blue background (#eff6ff), blue text (#1d4ed8) ✓
- Target node (Brake Actuator Units): red border (#b42318), red background (#fff1f2), red text (#b42318) ✓
- Intermediate nodes: neutral gray/slate ✓

---

### TC-07 — Edge Labels Show Protocol ✅ PASS

**Result:** Edge labels display protocol names correctly. The "SPI" label is visible on the edge between Main Brake ECU and Brake Actuator Units. Verified in canvas capture and Cytoscape data (`edge.data('label') = 'SPI'`).

---

### TC-08 — Trust Boundary Crossings Render as Dashed Amber Edges ✅ PASS

**Result:** The SPI edge (crossesTrustBoundary=true) renders as a dashed amber arrow. Canvas pixel sampling at the edge midpoint returned RGBA `(245, 158, 11, 206)` which matches `#f59e0b` (the configured amber color). Non-crossing edges would render as solid gray.

**Note:** For the first path tested (Main Brake ECU → Brake Actuator Units via SPI), this edge is flagged as crossing a trust boundary. Whether this is semantically correct is debatable (SPI is an on-board bus, not an external crossing), but it is the data generated by the backend.

---

### TC-09 — Edge Hover: Tooltip Appears with Reasoning and Mitigation ❌ FAIL

**Result:** No tooltip appears on edge hover for any path.

**Root cause (backend + frontend):** `edgeReasoning` and `edgeMitigation` are empty strings for all edges (`step.edgeReasoning` and `step.edgeMitigation` are not present in the API response — the worker did not populate them). The frontend tooltip handler includes an early-return guard:
```ts
if (!reasoning && !mitigation) return;
```
Empty strings are falsy, so the tooltip never fires. Even if the hover event triggers, nothing is shown.

---

### TC-10 — First Hop Has No Tooltip ✅ PASS (by default)

**Result:** The start node has no incoming edge in the graph. No incoming arrow points into it. Since TC-09 already confirms no tooltip fires for any edge, this trivially passes — no spurious tooltip appears near the start node either.

---

### TC-11 — Switching Between Paths Updates the Graph ⚠️ PARTIAL FAIL

**Result:** Switching path cards does update the Cytoscape graph with new elements. Nodes and edges change to reflect the newly selected path. However, two bugs were observed:

1. **Layout does not re-run on path switch.** After switching to a 3-hop path (TCU → Central Gateway → Main Brake ECU), the dagre layout did not re-execute. All 3 nodes rendered stacked on top of each other in the top-left corner, clipped outside the canvas viewport. The `react-cytoscapejs` `layout` prop only triggers on initial mount, not on element updates.

2. **Missing edge in 3-hop graph.** For the path TCU → Central Gateway → Main Brake ECU, the Cytoscape graph contained 3 nodes but only 1 edge (`edge-1`: Central Gateway → Main Brake ECU via CAN). The first edge (`edge-0`: TCU → Central Gateway via Ethernet) was absent from `cy.edges()`.

**Canvas capture for path B (TCU → Main Brake ECU):** Two nodes visible (TCU, Main Brake ECU), overlapping, no edges visible, partially clipped at canvas edge. Central Gateway node not rendered.

---

### TC-12 — Search Filters the List Panel ⚠️ PARTIAL FAIL

**Result:**
- Searching `"Brake"` → 196 cards (down from 248). **Target name search works correctly.**
- Searching `"TCU"` → 0 cards, "No paths match the current search" message shown. **Start name search fails.**

**Root cause (downstream of TC-02):** The search filter runs:
```ts
(p.targetAsset?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
(p.startAsset?.name ?? '').toLowerCase().includes(search.toLowerCase())
```
Since `startAsset` is null for all paths, `p.startAsset?.name ?? ''` always returns `''` and never matches any search term. Paths that start from TCU, Cloud Backend, etc. are invisible to search.

---

### TC-13 — Zero Paths Empty State — NOT TESTED

The standard Brake-by-Wire input generates 248 paths. An isolated highly-secured system description would be needed to trigger this. The code path exists (`<ShieldAlert>` + "No high-confidence paths found" message) and the logic is sound.

---

### TC-14 — No Run Selected Empty State ⚠️ PARTIAL FAIL

**Result:** Navigating to `/paths` with no `runId` shows a full-page empty state with a "Go to Threat Generation" CTA. No graph attempts to render. Passes on the stated pass criteria.

**Issue:** The message reads "No valid attack paths found / Please generate model and threats first." This is semantically incorrect — the actual condition is "no run was selected", not "attack paths were not found." A user who has a completed run but navigates directly to `/paths` would be confused by this message, thinking their run has no attack paths. The copy should differentiate between "no run selected" and "run has no paths."

---

## Additional Observations

### Frontend

**F-1: Right panel header copy not updated.**
The `<h3>Attack Sequence</h3>` was supposed to be replaced with a two-column flex row showing path identity (start → target) plus stats. The stats row (Feasibility, Impact, boundary crossings) is correctly implemented, but the heading text still reads "Attack Sequence" rather than the path's start→target identity. Compare the findings doc: *"Replaced `<h3>Attack Sequence</h3>` with a two-column flex row showing path identity..."*

**F-2: `width: 'label'` deprecation warning.**
Cytoscape logs `The style value of 'label' is deprecated for 'width'` twice on page load. This corresponds to `width: 'label'` in the default node stylesheet. While this doesn't cause a crash, it is a deprecated API that may be removed in a future Cytoscape version. The auto-sizing still works but should be replaced with `width: function(el) { return el.data('label').length * 7 + 20; }` or a CSS-based approach.

**F-3: "No active run." in sidebar after run completes.**
After the run pipeline finished, the System Status panel in the sidebar shows "No active run." This is expected behavior (run is no longer actively running), but could be improved by showing the last completed run or a "Completed" status indicator.

**F-4: Layout not re-run on path switch (TC-11 root cause).**
`react-cytoscapejs` receives updated `elements` prop when `selectedPath` changes, but the `layout` is not re-applied. The fix is to either:
- Use a `key` prop on `CytoscapeComponent` tied to `selectedPath.id` to force a full remount
- Manually call `cy.layout(cytoscapeLayout).run()` inside the `cy` callback after clearing + adding new elements

**F-5: Cytoscape graph shifts slightly on re-render.**
When `cy.removeAllListeners()` is called in the `cy` callback, it fires on every render including those triggered by tooltip hover state changes (`hoveredEdge` updates). This may cause the layout to re-run unnecessarily. The listener removal is necessary for correctness but the scope should be narrowed.

**F-6: 248 paths in list — poor UX for large runs.**
248 path cards with nearly identical display (all "—" → asset name, Critical severity, Fr: 0.90) creates a scrolling list with no differentiation. With startAsset names missing, all cards look identical except for the truncated ID and step count. Pagination or collapsing by (start, target) pair would greatly improve usability.

---

### Backend

**B-1: `startAsset` absent from API response (critical).**
`AttackPathsService.getByRunId()` returns an object with `startAsset` added via spread + map, but the property is entirely absent from the HTTP response JSON (`has("startAsset")` = false). `targetAsset` is present because it comes from Prisma's `include` clause. The extra property added via manual object spread is being stripped. Investigation needed: check if Fastify response serialization or a plugin is removing non-Prisma properties. A simple workaround would be to include `startSurface` in the Prisma `include` as a relation (add an `Asset` relation named `startAsset` to the Prisma schema), or use `JSON.stringify` explicitly in the controller response.

**B-2: LLM enrichment not running or results discarded (critical).**
All 248 paths have `initial_access_description = NULL` and no `edgeReasoning`/`edgeMitigation` in their steps JSON. The structured schema (`EVAL_SCHEMA`) requires these fields. Possible causes:
- The worker process (PID 73647, started at 11:43AM) compiled the worker before iteration-1 changes were written — meaning the old, unenriched version of the worker ran this job.
- The Gemini API call is succeeding but the structured output returns empty/null for the required fields, and the `?? null` fallback stores null.
- A silent exception in the LLM batch loop that swallows errors but still stores candidate paths.

Recommendation: Add explicit logging around the Gemini call result and validate that `initialAccessDescription` is non-empty before storing. If null, mark the path as requiring re-evaluation rather than storing with null enrichment.

**B-3: Threshold filter not working — paths at 0.25 stored.**
The filter `if (evaluation.feasibilityScore <= 0.7) continue` should prevent low-confidence paths from being stored. The presence of paths at 0.25, 0.35, 0.40 in the DB suggests either: (a) the filter wasn't present in the running worker version, or (b) all candidate paths are somehow landing in `evaluatedPaths` without going through the filter. Given B-2 (enrichment not running), the most likely explanation is that the paths were stored by an older version of the worker that didn't have the filter.

**B-4: BFS path explosion — 248 paths for 11 assets.**
49 threats × multiple entry points × BFS to all high-value targets produces a combinatorial explosion. Many paths are structurally identical (same hops) but attributed to different threats. The worker should deduplicate on `(startSurface, targetAssetId, steps hash)` before LLM evaluation to reduce API calls and storage.

**B-5: Most paths start from internal assets.**
The majority of paths start FROM Main Brake ECU, Central Gateway, or TCU — these are internal components, not external entry points. Expected paths like "Cloud Backend → TCU → Gateway → Brake ECU" do appear in the list but are not dominant. The threat entry point resolution (substring fallback fix from this iteration) appears partially effective.

**B-6: `evidenceRefs.threatId` field name mismatch.**
The worker stores `evidenceRefs: { threatId: path.threatId, cveIds: [...] }`. The OpenAPI spec defines `evidenceRefs` as `{ threatId?, cveIds? }`. This is consistent. No bug, but worth confirming the frontend uses the right key if it ever renders evidence refs.
