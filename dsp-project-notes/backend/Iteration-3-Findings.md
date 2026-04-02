# Backend Implementation — Iteration 3 Findings

> Generated during implementation of Iteration-2-Decisions.md.
> Ordered by severity. Items marked **[sus]** are bugs or silent correctness issues. Items marked **[smell]** are code quality concerns worth revisiting.

---

## P0 — Bugs / Silent Failures

---

### F1 — `create-app.ts` FastifyError Handler Is Unreachable for Most Errors [sus]

**Location:** `src/core/http/create-app.ts` lines 26–29

**Issue:** The `if (err instanceof FastifyError)` branch only sends a response if `err.code === 'FST_ERR_TEST'`. Any other Fastify error (e.g. `FST_ERR_VALIDATION` — schema validation failure, `FST_ERR_NOT_FOUND` — 404 from route registry) falls through the `if` without sending a response. Fastify will likely send its own default response, but the intent here was clearly to centralise all error handling. The `FST_ERR_TEST` guard looks like a leftover placeholder from initial scaffolding.

**Suggested fix:** Remove the inner `if (err.code === 'FST_ERR_TEST')` guard and always handle any `FastifyError` with its `statusCode`:
```ts
if (err instanceof FastifyError) {
  req.log.error({ err }, "request failed");
  return reply.status(err.statusCode || 500).send({ ok: false, error: { code: err.code, message: err.message } });
}
```

---

### F2 — `evidenceRefs.assetIds` Stores Asset Names, Not IDs [sus]

**Location:** `src/workers/threats.worker.ts` — `evidenceRefs` persist call

**Issue:** The `Threat.evidenceRefs` JSON column stores `{ assetIds: t.evidenceRefs, crossingId: t.crossingId }`. After the C3 fix, the LLM returns exact asset *names* in `evidenceRefs`. These names are stored as-is — not resolved to IDs. The field is called `assetIds` but contains strings. Any downstream consumer reading `evidenceRefs.assetIds` expecting UUIDs will silently get names.

**Suggested fix (next iteration):** Resolve `t.evidenceRefs` through `assetNameToId` (same pattern as `entryPoints`/`impactedAssets`) before persisting, and store the resolved IDs.

---

## P1 — Data Quality / Correctness

---

### F3 — `CveMatchTier.contextual` Semantic Mismatch [smell]

**Location:** `src/workers/cves.worker.ts` — Tier 3 keyword path

**Issue:** The `CveMatchTier` enum has three values: `exact`, `near`, `contextual`. The decisions doc defined Tier 2 as "base CPE" (stored as `near`) and Tier 3 as "keyword" (stored as `contextual`). `contextual` was originally intended for the future pgvector semantic search tier (Tier 2 in DEFERRED-TODOS). Now `contextual` is used for keyword matches — when semantic search is eventually added, there will be no distinct tier value for it.

**Suggested fix:** Add a `keyword` value to `CveMatchTier` in the Prisma schema for Tier 3, and reserve `contextual` for the future semantic search tier. Requires a migration.

---

### F4 — Model Quality Score Inflated After m2 Fix

**Location:** `src/modules/ingestion/ingestion.service.ts` lines 263–273

**Issue:** `totalEntities` counts all DB rows created, including one row per linked asset for safety functions. After the m2 fix, a safety function with 3 linked assets creates 3 rows and counts as 3 entities. This inflates `modelQualityScore` beyond 1.0 for systems with many safety function–asset links.

**Suggested fix:** Count `extracted.safetyFunctions.length` (the number of distinct extracted functions) rather than the number of rows persisted.

---

### F5 — BFS Ignores Interface Direction — All Edges Bidirectional [sus]

**Location:** `src/workers/attack-paths.worker.ts` lines 194–211

**Issue:** The graph construction adds a reverse edge for every data flow unconditionally (`direction: "bidirectional"`). The `Interface` records have a `direction` field extracted during ingestion (stored in `metadata.direction`). The attack path worker ignores this and models all connections as traversable in both directions, which can produce false paths (e.g. an attacker traversing a receive-only CAN bus upstream).

**Suggested fix:** When building edges from data flows, check the associated interface's `direction`. Add a reverse edge only if `direction === "bidirectional"`.

---

### F6 — `risk.worker.ts` Threat Exploitability Hardcoded at 0.5

**Location:** `src/workers/risk.worker.ts` line 100

**Issue:** Threat risk items use `exploitability = 0.5` as a static default. Now that M4 is shipped, `Threat.impactBreakdown` is populated with `safetyImpact`, `financialImpact`, and `operationalImpact`. The `operationalImpact` field is a reasonable proxy for exploitability severity. `complete_loss` → `0.9`, `loss_of_function` → `0.7`, `degraded` → `0.5`, `negligible` → `0.2` would be a simple, data-driven improvement.

---

## P2 — Code Quality

---

### F7 — No Structured Logger in Workers [smell]

**Location:** All workers (`src/workers/*.ts`)

**Issue:** All workers use `console.warn`/`console.error` with string interpolation. Fastify uses pino (structured JSON logs). Worker log lines have no `runId` field — they can't be correlated with a run in any log aggregator. The log format is also inconsistent between the HTTP layer (pino JSON) and worker layer (plain strings).

**Suggested fix:** Create a thin `src/utils/logger.ts` wrapping pino (already a transitive dep via Fastify) and import it in workers. Include `runId` as a base field on the worker logger instance.

---

### F8 — Unused Variable `targetNode` in Attack Paths Worker [smell]

**Location:** `src/workers/attack-paths.worker.ts` line 343

**Issue:** `const targetNode = graph.get(path.targetAssetId)` is assigned but never read. Was likely intended for extracting asset metadata during scoring but the code path was simplified.

**Suggested fix:** Remove the assignment.

---

### F9 — `create-app.ts` Error Handler Shape Inconsistency (Still Deferred)

**Location:** `src/core/http/create-app.ts` lines 31–37

**Note:** The `else` branch (generic 500) returns `{ message, error, statusCode }` while all other branches return `{ error }` or `{ ok, error }`. Still the same issue as Iteration-2-Findings #13. Still deferred per DEFERRED-TODOS.md. Re-flagging here so it doesn't keep slipping.

---

## Notes from Implementation

- `CveMatchTier` enum values needed at implementation time — decision doc used string literals (`"cpe"`, `"keyword"`) that didn't match the schema enum. Mapped to `near` and `contextual` respectively. This is covered by F3 above.
- `ImpactBreakdown` → `Prisma.InputJsonValue` required a double cast via `unknown`. Normal pattern for Prisma JSON columns with typed interfaces — no issue.
- dotenv v17 (installed) is ESM-compatible with `import 'dotenv/config'`. No issues expected.
