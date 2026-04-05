# Attack Paths — Iteration 1 Findings

## What was implemented

All 7 spec items implemented. Both backend and frontend are complete with zero typecheck errors.

---

### Backend changes

**Threats worker — substring fallback (`threats.worker.ts`)**
Added a 4th fallback after the existing direct/interface/boundary lookups in `resolveAssetNames`. If all three fail, it tries substring containment (both directions, case-insensitive). This addresses the root cause of zero `ThreatEntryPoint` rows when the LLM abbreviates asset names (e.g. `"TCU"` vs `"Telematics Control Unit (TCU)"`).

**Attack paths worker — trust boundary fix (`attack-paths.worker.ts`)**
Replaced the broken `assetTrustZone` map with a `crossingPairs` Set. The old approach tagged all assets connected through a crossing interface as being "inside" the same boundary, meaning source and target always shared a zone and `crossesTrustBoundary` was always `false`. The new approach records only the exact endpoint pairs of each crossing interface, so the flag fires correctly.

**Attack paths worker — enrichment and score threshold**
- `PathHop` now carries `edgeReasoning` and `edgeMitigation` (null during BFS, populated after LLM evaluation).
- `PathEvaluation` and `EVAL_SCHEMA` extended to request `initialAccessDescription` and `hopEvaluations` from the LLM.
- `EVAL_SYSTEM_PROMPT` appended with instructions for both new fields.
- Score threshold applied: paths with `feasibilityScore <= 0.7` are dropped before storage.
- `hopEvaluations` merged back into enriched `PathHop` objects post-LLM.

**Attack paths worker — `prisma.attackPath.create`**
Now writes `initialAccessDescription` to the new DB column.

**Attack paths service (`attack-paths.service.ts`)**
`getByRunId` now does a secondary lookup to resolve `startSurface` (an asset ID) into an `{ id, name, kind }` object, attached as `startAsset` on each path. No schema change required.

**Prisma schema + migration**
Added `initialAccessDescription String? @map("initial_access_description")` to `AttackPath`. Migration `20260405070721_add_attack_path_initial_access` applied.

**OpenAPI schema**
- `PathHop`: added `edgeReasoning` and `edgeMitigation` as nullable string fields.
- `AttackPath`: added `initialAccessDescription` (nullable string) and `startAsset` (nullable Asset ref).
- `getAttackPaths` description updated to note the 0.7 threshold.

**Types regenerated** via `npm run api:types` — no manual edits to `generated/api.ts` or `types.ts`.

---

### Frontend changes (`AttackPaths.tsx`)

**List panel**
- Start node display replaced from raw `path.startSurface` (cuid) to `path.startAsset?.name ?? '—'`.
- Search filter updated to search `startAsset.name` instead of `startSurface`.
- Zero-paths empty state added: if the run produced zero paths (all below threshold), shows a `ShieldAlert` icon with explanation copy instead of an empty list.

**Right panel — header**
Replaced `<h3>Attack Sequence</h3>` with a two-column flex row showing path identity plus Feasibility, Impact, and (conditionally) boundary crossing count.

**Right panel — initial access card**
Rendered above the graph whenever `selectedPath.initialAccessDescription` is non-null. Styled with amber tones and a lock emoji. No fallback if null — card is simply absent.

**Right panel — Cytoscape graph**
Replaced the existing linear timeline with a `CytoscapeComponent` using `cytoscape-dagre` for left-to-right layout. Node styling:
- Default: slate fill, round-rectangle
- Start node (`isStart`): blue border + tint
- Target node (`isTarget`): red border + tint

Edge styling:
- Default: grey arrow with protocol label
- Trust-boundary-crossing edges: dashed amber

`cytoscape.use(dagre)` called once at module level. The `cy` callback always calls `cy.removeAllListeners()` first to avoid stacking duplicate handlers across renders.

**Right panel — edge hover tooltip**
`hoveredEdge` state tracks reasoning, mitigation, and cursor position. Tooltip is `position: absolute` inside the `graphContainerRef` div (which has `position: relative`). Shows "Why possible" (slate) and "How to block it" (green) sections. Positions are clamped to avoid overflowing the panel.

---

## Assumptions and decisions

1. **Tooltip clamping constants (560 / 400)**: The spec used hardcoded clamp values. These are estimates for a typical right-panel layout at default viewport. If the panel renders at a very different size the tooltip may still overflow. A future iteration could read `container.getBoundingClientRect()` for dynamic clamping.

2. **`cytoscape-dagre` type augmentation**: `cytoscape-dagre` is already in `package.json`. The `dagre` import uses the existing `@types/cytoscape` definitions. No type cast was needed; the `layout` object is typed as `CytoscapeOptions['layout']` via the component prop.

3. **Zero-paths vs no-search-match empty states**: Spec only showed the zero-paths state. A separate "no search match" message is still shown when there are paths but none match the filter text. Both states coexist correctly.

4. **`graphContainerRef` div margins**: Added `mx-[24px] my-[16px]` to the graph container for breathing room. The spec diagram did not specify inner padding for the graph area; this matches the card padding used in the initial access card above it.

5. **`isStart` / `isTarget` as boolean Cytoscape data selectors**: The stylesheet uses `node[?isStart]` which is Cytoscape's boolean truthy selector. This works correctly with `boolean` data values.
