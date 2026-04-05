# Model Explorer — Backend Iteration 2

## Context

Iteration 1 is in place. Two backend failures were identified in QA. Both are blockers for the feature being considered complete.

Reference: `QA/V1/model-explorer/qa-findings-iteration-1.md`

---

## Changes Required

### 1. Ingestion — Populate `memberAssetIds` in Trust Boundary Metadata (TC-06)

**Problem:** The ingestion AI worker extracts trust boundaries with `name`, `boundaryType`, and `crossingInterfaceNames` — but never extracts which assets sit *inside* each boundary. As a result, `metadata.memberAssetIds` is absent from every trust boundary record, and the frontend cannot render trust boundary containers with any member nodes.

The DB evidence from QA confirms:
```json
{ "boundaryType": "Physical", "crossingInterfaceNames": ["..."] }
```
`memberAssetIds` is simply not there.

**Fix:** Three changes to `src/modules/ingestion/ingestion.service.ts`:

**A. Update `EXTRACTION_SCHEMA`** — add `memberAssetNames` as a required string array field inside the `trustBoundaries` item object:

```ts
memberAssetNames: {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
}
```

Mark it `required` alongside `name`, `boundaryType`, `crossingInterfaceNames`.

**B. Update `EXTRACTION_SYSTEM_PROMPT`** — add explicit instruction to the model to list which asset names belong inside each trust boundary. The model already receives the full asset list as part of the extraction context. Add:

> "For each trust boundary, `memberAssetNames` must list the names of assets that reside **inside** that boundary. Use the exact asset names as extracted — do not paraphrase."

**C. Update the trust boundary creation loop** — resolve `memberAssetNames` to IDs using `assetNameToId` and include them in metadata:

```ts
const memberAssetIds = tb.memberAssetNames
  .map(name => assetNameToId.get(name))
  .filter((id): id is string => !!id);

await prisma.trustBoundary.create({
  data: {
    runId,
    name: tb.name,
    metadata: {
      boundaryType: tb.boundaryType,
      crossingInterfaceNames: tb.crossingInterfaceNames,
      memberAssetIds,
    },
  },
});
```

No schema migration required — `metadata` is already a JSON column.

---

## What NOT to Change

- `assets.service.ts` — the trust boundary query already includes `metadata` from iteration 1; no further changes needed
- `openapi.yaml` — the `TrustBoundary.metadata` field was already updated in iteration 1
- Prisma schema — no migration needed
- Any other worker — scope this fix to mitigations worker only; do not refactor other workers as part of this change

---

## Critical Issue from QA (TC-06) — ADDRESSED

**QA finding:** `GET /runs/:runId/assets` returned trust boundaries with only `{id, runId, name}` — `metadata` was absent from the API response despite the DB storing `memberAssetIds` correctly.

**Root cause:** `prisma.trustBoundary.findMany` in `assets.service.ts` used `select: { id: true, runId: true, name: true }` without `metadata: true`. Prisma's `select` is an allowlist — omitting a field means it is never fetched or returned. The route has no TypeBox response schema, so Fastify uses `JSON.stringify` (not `fast-json-stringify`) and would preserve all fields if they were present; the strip happened at the Prisma query level, not in serialization.

**Fix applied (iteration 1):** Added `metadata: true` to the trust boundary select in `src/modules/assets/assets.service.ts:40`:

```ts
prisma.trustBoundary.findMany({
  where: { runId },
  select: { id: true, runId: true, name: true, metadata: true },
}),
```

`metadata` (containing `boundaryType`, `crossingInterfaceNames`, `memberAssetIds`) now flows through to the API response. No serialization or schema changes were needed — the fix was purely at the query layer.
