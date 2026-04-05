# Threat Generation — Backend Changes (Iteration 1)

## Aim

Three issues needed fixing to make the threat generation step V1 ready:
1. Entry points were always empty (0 per threat) despite interfaces having correct metadata
2. `impactBreakdown` values were stored with inconsistent casing and free-text strings (especially for HEAVENS), making downstream severity derivation unreliable
3. The API response did not expose a `severity` field, and `entryPoints`/`impactedAssets` were returned as join-table objects instead of flat Asset arrays

---

## Problem 1 — Entry Points Always Zero

### Root Cause

The `resolveAssetNames` function used `Map.get(name)` which is case-sensitive. The LLM was returning entry point names (typically interface names like `"OBD-II Diagnostic Port"`) with casing that didn't exactly match the stored interface names. Additionally, when all name lookups fail, no fallback existed.

### Fix

**`src/workers/threats.worker.ts`**

Added `makeCaseInsensitiveLookup` — wraps any `Map<string, T>` with a lowercase fallback:

```ts
function makeCaseInsensitiveLookup<T>(map: Map<string, T>): (key: string) => T | undefined {
  const lower = new Map<string, T>();
  for (const [k, v] of map.entries()) lower.set(k.toLowerCase(), v);
  return (key: string) => map.get(key) ?? lower.get(key.toLowerCase());
}
```

Applied to all three name lookups inside `resolveAssetNames` (asset, interface, boundary).

Additionally added a crossing-based fallback in `persistThreats`. When `resolvedEPs` is still empty after name resolution, the crossing ID (format: `{trustBoundaryId}:{interfaceName}`) is parsed to extract the interface name, and that interface's endpoint assets are used as entry points. This is semantically correct — entry points for a threat at a crossing are always the interface's endpoint assets.

```ts
if (resolvedEPs.length === 0) {
  const colonIdx = t.crossingId.indexOf(":");
  if (colonIdx !== -1) {
    const crossingIfaceName = t.crossingId.substring(colonIdx + 1);
    const ifaceAssetIds = interfaceNameToAssetIds.get(crossingIfaceName)
      ?? interfaceNameToAssetIds.get(crossingIfaceName.toLowerCase());
    if (ifaceAssetIds?.length) resolvedEPs = ifaceAssetIds;
  }
}
```

---

## Problem 2 — ImpactBreakdown Not Normalized

### Root Cause

Gemini's structured output was not strictly enforcing the enum vocabulary for `impactBreakdown`. HEAVENS threats especially were returning free-text values like `"Extreme (Loss of vehicle control, severe injury, or fatality)"` instead of `"catastrophic"`. STRIDE threats had capitalization mismatches (`"Critical"` instead of `"critical"`).

### Fix

Added four normalization functions (`normalizeSafetyImpact`, `normalizeFinancialImpact`, `normalizeOperationalImpact`, `normalizeImpactBreakdown`) that map raw LLM output to the canonical enum values using keyword-based matching. Applied in `persistThreats` before storing to DB:

```ts
impactBreakdown: normalizeImpactBreakdown(t.impactBreakdown) as unknown as Prisma.InputJsonValue,
```

---

## Problem 3 — API Response Shape + Missing Severity

### Changes

**`src/modules/threats/threats.service.ts`** — full rewrite:

- `deriveSeverity(impactBreakdown)` — computes `"low" | "medium" | "high" | "extreme"` from the three impact dimensions. Takes the max score across all three axes; each axis maps keywords to scores 1–4.
- Response transformation: `entryPoints` and `impactedAssets` are flattened from Prisma join-table objects `{ assetId, asset: {...} }` to plain `Asset` objects `{ id, name, kind }` matching the OpenAPI spec.
- Added `severity` field to every returned threat.

**`openapi.yaml`** — added `ThreatSeverity` enum schema and `severity` field to `Threat`:

```yaml
ThreatSeverity:
  type: string
  enum: [low, medium, high, extreme]

Threat:
  required: [id, runId, category, framework, description, confidence, severity]
  properties:
    severity:
      $ref: "#/components/schemas/ThreatSeverity"
```

**`src/modules/threats/threats.model.ts`** — updated `ThreatResponse` interface to include `severity`, flat `entryPoints`, and flat `impactedAssets`.

---

## No Schema Migration Required

All changes are in worker logic, service transforms, and the OpenAPI spec. No new DB columns, no Prisma migration.

---

## Impact on Existing Runs

Existing threats in the DB will have dirty `impactBreakdown` values and 0 entry points. The severity derivation in the service uses keyword-based matching that handles the existing dirty values gracefully — so existing runs will display correct severity in the UI. Entry points for existing runs remain empty until a re-run.
