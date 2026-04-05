# Attack Paths — Backend Changes (Iteration 1)

## Goal

Fix the root cause of zero attack paths being generated and enrich the stored data to support the per-hop diagram the frontend needs to render.

There are two independent problems:
1. **Upstream bug in threats worker** — threat entry points are never written to the DB, so the BFS in the attack paths worker has no starting nodes and produces nothing.
2. **Attack paths worker gaps** — even once entry points are fixed, the stored data is too thin to power the diagram (no per-hop edge descriptions, no initial access description, no resolved start asset name, and no score threshold applied).

All changes are in the worker and service files. No new routes or controllers required.

---

## Change 1 — Fix threat entry point resolution (`src/workers/threats.worker.ts`)

**Why it's broken:** `resolveAssetNames` does a case-insensitive exact match, then an interface name match, then a boundary name match. The LLM frequently returns abbreviated names (e.g. `"TCU"` instead of `"Telematics Control Unit (TCU)"`) even with the verbatim instruction. All three lookups fail silently, so every threat ends up with zero `ThreatEntryPoint` rows written.

**Fix:** Add a fourth fallback — substring containment match — as a last resort inside `resolveAssetNames`. After the three existing lookups fail for a name, check whether any asset name in the map contains the candidate string or the candidate contains the asset name (case-insensitive). Take the first match.

In `resolveAssetNames`, after the three existing lookups, replace the `console.warn` + continue with:

```typescript
// Substring fallback — handles LLM abbreviations like "TCU" → "Telematics Control Unit (TCU)"
let substringMatch: string | undefined;
for (const [assetName, assetId] of assetNameToId.entries()) {
  const lowerKey = name.toLowerCase();
  const lowerAsset = assetName.toLowerCase();
  if (lowerKey.includes(lowerAsset) || lowerAsset.includes(lowerKey)) {
    substringMatch = assetId;
    break;
  }
}
if (substringMatch) {
  resolved.push(substringMatch);
  continue;
}

console.warn(
  `[threats] "${context.field}" name not found in any map — skipping. threatId=${context.threatId}, name="${name}"`,
);
```

No other changes to `threats.worker.ts`.

---

## Change 2 — Fix trust boundary crossing detection (`src/workers/attack-paths.worker.ts`)

**Why it's broken:** The current code marks every asset that appears as an endpoint of a crossing interface as being "inside" that boundary. Since crossing interfaces connect assets on both sides (e.g. the 4G interface links the TCU and the Cloud Backend, both of which get tagged as "inside" the Vehicle Internal Network Boundary), the source and target of any crossing data flow end up in the same zone. The `source zone !== target zone` check therefore never fires and `crossesTrustBoundary` is always `false`.

**Fix:** Replace the `assetTrustZone` map with a `crossingPairs` set. A data flow crosses a trust boundary if and only if its source→target asset pair matches an endpoint pair of a crossing interface.

**Remove** the `assetTrustZone` block entirely and replace with:

```typescript
// Build a set of asset-ID pairs that cross at least one trust boundary
const assetNameToId = new Map(assets.map((a) => [a.name, a.id]));
const crossingPairs = new Set<string>();

for (const tb of trustBoundaries) {
  const meta = tb.metadata as { crossingInterfaceNames?: string[] } | null;
  for (const ifaceName of meta?.crossingInterfaceNames ?? []) {
    const iface = interfaces.find((i) => i.name === ifaceName);
    if (!iface) continue;
    const ifaceMeta = iface.metadata as { endpointAssetNames?: string[] } | null;
    const endpointIds = (ifaceMeta?.endpointAssetNames ?? [])
      .map((name) => assetNameToId.get(name))
      .filter((id): id is string => id !== undefined);
    if (endpointIds.length >= 2) {
      crossingPairs.add(`${endpointIds[0]}:${endpointIds[1]}`);
      crossingPairs.add(`${endpointIds[1]}:${endpointIds[0]}`);
    }
  }
}
```

Then update the edge construction to use `crossingPairs` instead of `assetTrustZone`:

```typescript
const crossesBoundary = crossingPairs.has(`${df.sourceId}:${df.targetId}`);
```

And update the `trustBoundaryCrossings` count when recording a candidate path:

```typescript
const tbCrossings = newHops.reduce((count, hop, idx) => {
  if (idx === 0) return count;
  const prevHop = newHops[idx - 1];
  return crossingPairs.has(`${prevHop.assetId}:${hop.assetId}`) ? count + 1 : count;
}, 0);
```

The `assetTrustZone` map, and all references to it in the node construction and edge construction blocks, can be deleted.

---

## Change 3 — Add `initialAccessDescription` to Prisma schema

In `prisma/schema.prisma`, add one field to the `AttackPath` model:

```prisma
model AttackPath {
  // ... existing fields ...
  initialAccessDescription String? @map("initial_access_description")
  // ...
}
```

Run the migration:

```bash
npx prisma migrate dev --name add_attack_path_initial_access
```

---

## Change 4 — Enrich LLM evaluation schema and prompt (`src/workers/attack-paths.worker.ts`)

The LLM evaluator currently returns plausible/score/reasoning per path. It needs to also return:
- `initialAccessDescription` — how the attacker gains an initial foothold at the start node
- Per-hop edge descriptions — for each hop after the first, why the attacker can traverse to it and what would block that traversal

**Update the TypeScript interfaces:**

```typescript
interface HopEvaluation {
  hopIndex: number;        // matches PathHop.hop (1-based; entries start at hop 2)
  edgeReasoning: string;   // why attacker can move from previous node to this one
  edgeMitigation: string;  // what would block this traversal
}

interface PathEvaluation {
  pathIndex: number;
  plausible: boolean;
  feasibilityScore: number;
  reasoning: string;
  initialAccessDescription: string;
  hopEvaluations: HopEvaluation[];
}
```

**Update `EVAL_SCHEMA`** — add to the items object inside `evaluations`:

```typescript
initialAccessDescription: { type: SchemaType.STRING },
hopEvaluations: {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      hopIndex:        { type: SchemaType.NUMBER },
      edgeReasoning:   { type: SchemaType.STRING },
      edgeMitigation:  { type: SchemaType.STRING },
    },
    required: ["hopIndex", "edgeReasoning", "edgeMitigation"],
  },
},
```

Add `"initialAccessDescription"` and `"hopEvaluations"` to the `required` array of the evaluation item.

**Update `EVAL_SYSTEM_PROMPT`** — append the following instruction:

```
For each plausible path also provide:
- initialAccessDescription: one or two sentences explaining how the attacker gains initial
  access to the entry node (the specific vulnerability, exposed interface, or weakness exploited).
- hopEvaluations: for each hop after the first (hop 2, 3, ...), provide:
    - edgeReasoning: why movement from the previous node to this one is possible
      (protocol weakness, missing authentication, known CVE, trust assumption, etc.)
    - edgeMitigation: the most effective single control to block or detect this traversal
      (be specific — name the mechanism, standard, or patch, not generic advice)
```

---

## Change 5 — Merge hop evaluations into PathHop steps + apply score threshold

After receiving the LLM batch response, merge `hopEvaluations` back into the `PathHop` objects and drop paths that don't clear the 0.7 threshold.

Replace the current inner loop body:

```typescript
for (const evaluation of result.evaluations) {
  const path = batch[evaluation.pathIndex];
  if (!path) continue;
  if (!evaluation.plausible) continue;          // existing check
  // ADD: score threshold
  if (evaluation.feasibilityScore <= 0.7) continue;

  // Merge hopEvaluations into hops
  const enrichedHops: PathHop[] = path.hops.map((hop) => {
    const hopEval = evaluation.hopEvaluations?.find((h) => h.hopIndex === hop.hop);
    return {
      ...hop,
      edgeReasoning: hopEval?.edgeReasoning ?? null,
      edgeMitigation: hopEval?.edgeMitigation ?? null,
    };
  });

  evaluatedPaths.push({
    ...path,
    hops: enrichedHops,
    feasibilityScore: Math.max(0, Math.min(1, evaluation.feasibilityScore)),
    reasoning: evaluation.reasoning,
    initialAccessDescription: evaluation.initialAccessDescription ?? null,
  });
}
```

Update the `evaluatedPaths` array element type to carry `initialAccessDescription`:

```typescript
const evaluatedPaths: Array<
  CandidatePath & {
    hops: PathHop[];
    feasibilityScore: number;
    reasoning: string;
    initialAccessDescription: string | null;
  }
> = [];
```

**Update `PathHop` interface** to carry the new fields:

```typescript
interface PathHop {
  hop: number;
  assetId: string;
  assetName: string;
  edgeProtocol: string | null;
  crossesTrustBoundary: boolean;
  cvesAtHop: string[];
  edgeReasoning: string | null;   // ADD
  edgeMitigation: string | null;  // ADD
}
```

Set `edgeReasoning: null` and `edgeMitigation: null` when constructing hops during BFS (before LLM evaluation enriches them).

**Update the `prisma.attackPath.create` call** to pass `initialAccessDescription`:

```typescript
await prisma.attackPath.create({
  data: {
    // ... existing fields ...
    initialAccessDescription: path.initialAccessDescription,
  },
});
```

---

## Change 6 — Resolve start asset in service response (`src/modules/attack-paths/attack-paths.service.ts`)

`startSurface` is a raw asset ID string. The frontend needs the asset name. Resolve it at query time without a schema change.

Replace the current `getByRunId` method:

```typescript
async getByRunId(runId: string) {
  const paths = await prisma.attackPath.findMany({
    where: { runId },
    include: {
      targetAsset: { select: { id: true, name: true, kind: true } },
    },
    orderBy: { overallPathRisk: "desc" },
  });

  const startAssetIds = [...new Set(paths.map((p) => p.startSurface))];
  const startAssets = await prisma.asset.findMany({
    where: { id: { in: startAssetIds } },
    select: { id: true, name: true, kind: true },
  });
  const startAssetMap = new Map(startAssets.map((a) => [a.id, a]));

  return paths.map((p) => ({
    ...p,
    startAsset: startAssetMap.get(p.startSurface) ?? null,
  }));
}
```

---

## Change 7 — Update `openapi.yaml`

### `PathHop` schema

Add two new nullable fields:

```yaml
edgeReasoning:
  type: ["string", "null"]
  description: Why the attacker can traverse from the previous node to this one
edgeMitigation:
  type: ["string", "null"]
  description: The most effective control to block this traversal
```

### `AttackPath` schema

Add two new fields:

```yaml
initialAccessDescription:
  type: ["string", "null"]
  description: How the attacker gains initial access at the entry node
startAsset:
  allOf:
    - $ref: "#/components/schemas/Asset"
  nullable: true
  description: Resolved asset object for the startSurface ID
```

Update the `getAttackPaths` endpoint description to note the score threshold:

```yaml
description: |
  Returns attack paths with feasibilityScore > 0.7, sorted by overallPathRisk descending.
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/workers/threats.worker.ts` | Add substring fallback in `resolveAssetNames` |
| `src/workers/attack-paths.worker.ts` | Fix trust boundary detection; enrich `PathHop`; update LLM schema + prompt; apply score threshold; merge hop evaluations |
| `prisma/schema.prisma` | Add `initialAccessDescription` to `AttackPath` |
| `src/modules/attack-paths/attack-paths.service.ts` | Resolve start asset at query time |
| `openapi.yaml` | Add `edgeReasoning`, `edgeMitigation` to `PathHop`; add `initialAccessDescription`, `startAsset` to `AttackPath` |

After all changes, run `npm run api:types` to regenerate the shared types.
