# Model Explorer — Backend Changes for Graph View

## Aim

The frontend graph view needs to know which assets belong to which trust boundary so it can render assets visually grouped inside their boundary containers. Currently, trust boundaries only store which *interfaces* cross them — there is no asset membership data. Two things need to change: the ingestion AI prompt must be updated to extract asset membership, and the assets API response must return it.

---

## Problem

In `ingestion.service.ts`, the `trustBoundaries` extraction schema captures:
- `name` — boundary name
- `boundaryType` — e.g. "internal", "external"
- `crossingInterfaceNames` — which interfaces cross this boundary

It does **not** capture which assets sit *inside* the boundary. Without this, the frontend cannot group nodes into containers.

The `TrustBoundary` DB model has a `metadata` JSON field that already stores `boundaryType` and `crossingInterfaceNames`. No schema migration is needed — `memberAssetIds` can be added to this same JSON field.

In `assets.service.ts`, the trust boundary query currently excludes `metadata` from the select. The API response therefore returns trust boundaries with only `id`, `runId`, and `name` — no member information.

---

## Changes Required

### 1. `src/modules/ingestion/ingestion.service.ts`

**Update the AI extraction schema** — add `memberAssetNames` to the `trustBoundaries` item schema:

```
trustBoundaries: Array<{
  name: string;
  boundaryType: string;
  crossingInterfaceNames: string[];
  memberAssetNames: string[];   // ← ADD THIS
}>
```

**Update `EXTRACTION_SCHEMA`** — add `memberAssetNames` as a required string array field inside the `trustBoundaries` item object, alongside `crossingInterfaceNames`.

**Update `EXTRACTION_SYSTEM_PROMPT`** — add a sentence instructing the model to list the asset names that sit inside each trust boundary. Example addition:

> "For each trust boundary, include `memberAssetNames`: the list of asset names (using exact names from the assets list) that reside inside this boundary."

**Update the trust boundary creation loop** — when writing to DB, include `memberAssetNames` resolved to asset IDs in the metadata JSON:

```ts
// Inside the "Create trust boundaries" loop:
const memberAssetIds = tb.memberAssetNames
  .map(name => assetNameToId.get(name))
  .filter(Boolean);

await prisma.trustBoundary.create({
  data: {
    runId,
    name: tb.name,
    metadata: {
      boundaryType: tb.boundaryType,
      crossingInterfaceNames: tb.crossingInterfaceNames,
      memberAssetIds,              // ← ADD THIS
    },
  },
});
```

---

### 2. `src/modules/assets/assets.service.ts`

**Update the trust boundary query** — include `metadata` in the select so member asset IDs are returned:

```ts
prisma.trustBoundary.findMany({
  where: { runId },
  select: {
    id: true,
    runId: true,
    name: true,
    metadata: true,    // ← ADD THIS
  },
}),
```

The API response for `GET /runs/:runId/assets` will now include each trust boundary's `metadata`, which contains `memberAssetIds`. The frontend reads this to assign assets to their boundary containers.

---

### 3. `openapi.yaml`

Update the `TrustBoundary` schema to include the `metadata` field:

```yaml
TrustBoundary:
  type: object
  required: [id, runId, name]
  properties:
    id:
      type: string
    runId:
      type: string
    name:
      type: string
    metadata:
      type: object
      nullable: true
      properties:
        boundaryType:
          type: string
        memberAssetIds:
          type: array
          items:
            type: string
        crossingInterfaceNames:
          type: array
          items:
            type: string
```

After updating the spec, run `npm run api:types` in both `dsp-backend` and `dsp-frontend` to regenerate types.

---

## No Schema Migration Required

All changes are confined to the `metadata` JSON field on the existing `TrustBoundary` model. No new tables, no new columns, no Prisma migration needed.

---

## Impact on Existing Runs

Existing runs in the DB will have trust boundaries with no `memberAssetIds` in metadata (it won't exist as a key). The frontend should handle this gracefully — if `memberAssetIds` is absent or empty for a trust boundary, render the boundary container as an unlabeled overlay without grouping any nodes, rather than crashing.
