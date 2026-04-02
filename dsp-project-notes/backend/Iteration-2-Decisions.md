# Backend Implementation — Iteration 2 Decisions

> Source: QA/Iteration-1.md (pipeline end-to-end test) and Iteration-2-Findings.md flagged items.
> These are binding instructions for the backend agent going into iteration 3.
> Decisions made via live interview on 2026-04-02.

---

## Guiding Principle

Same as iteration 2: idiomatic and direct. Fix the broken things in priority order. No speculative hardening or gold-plating. Each issue below has an explicit decision and concrete instructions — follow them as written.

---

## P0 — Blockers

---

### Issue C1 — `.env` Not Loaded at Runtime

> **Finding:** `tsx` does not auto-load `.env`. `GEMINI_API_KEY` resolves to `""` and all Gemini calls return 403. All new developers hit this silently on first run.

**Decision:** Add `dotenv` and import at the top of `src/config/env.ts`. All `process.env` access in this codebase goes exclusively through `env.ts` (verified — `prisma-client.ts` only reads `NODE_ENV` which is never in `.env`), so this is the correct and clean placement.

**Instructions for backend agent:**

- Install `dotenv` package.
- Add `import 'dotenv/config'` as the **first line** of `src/config/env.ts`, before any `process.env` reads.
- Do NOT add dotenv imports anywhere else.

---

### Issue C2 — NVD CVE Matching Returns Irrelevant Results

> **Finding:** Exact versioned CPE query returns 0 results for some components (e.g. Linux Kernel 5.10). Keyword fallback then returns 2000+ CVEs because NVD matches any CVE mentioning the keyword in its description. All stored as `matchTier: "exact"`. Every junk CVE creates a RiskItem and a mitigation call — pipeline took 1–2 hours.

**Decision:** Replace the current two-step (CPE → keyword) approach with a strict 3-tier waterfall. Each tier only fires if the previous returned 0 results.

**Instructions for backend agent (`src/workers/cves.worker.ts`):**

**Tier 1 — Exact versioned CPE:**
- Query: `GET /rest/json/cves/2.0?cpeName={fullVersionedCpe}&apiKey={key}`
- Example: `cpeName=cpe:2.3:o:linux:linux_kernel:5.10:*`
- If results returned: store with `matchTier: "exact"`, stop here for this software instance.

**Tier 2 — Base CPE without version:**
- Only fires if Tier 1 returns 0 results.
- Query: `GET /rest/json/cves/2.0?cpeName={baseProductCpe}&isVulnerable=true&resultsPerPage=100&apiKey={key}`
- Base CPE: strip the version segment — e.g. `cpe:2.3:o:linux:linux_kernel:5.10:*` becomes `cpe:2.3:o:linux:linux_kernel:*`
- After fetching, sort results client-side by CVSS score descending before storing.
- Store with `matchTier: "cpe"`.

**Tier 3 — Keyword fallback:**
- Only fires if Tier 2 returns 0 results.
- Query: `GET /rest/json/cves/2.0?keywordSearch={name}&keywordExactMatch=true&resultsPerPage=20&apiKey={key}`
- Use `SoftwareInstance.name` as the keyword (not name+version).
- Do NOT add `isVulnerable` to this query — the param has no CPE to validate against.
- Store with `matchTier: "keyword"`.

**Redis cache keys** remain the same pattern but must account for the new tiers:
- `nvd:cpe:exact:{fullVersionedCpe}`
- `nvd:cpe:base:{baseProductCpe}`
- `nvd:kw:{name}`

---

### Issue C3 — Attack Paths Always 0: Entry Point Name Resolution Failure

> **Finding:** `threat_entry_points` has 0 rows for all runs. The threats worker matches LLM-returned asset names against DB asset names with exact `Map.get()` lookup. Name casing/phrasing differences cause all lookups to miss silently. BFS has no starting nodes and produces 0 paths.

**Decision:** Fix at the source — instruct the LLM to return exact asset names from the DB. Add explicit warning logging for any misses. Skip BFS for threats with 0 resolved entry points rather than fabricating fallback entry points.

**Instructions for backend agent (`src/workers/threats.worker.ts`):**

**Prompt change:**
- Before the Gemini call, fetch all asset names for the run from DB.
- Include them explicitly in the prompt as a reference list:
  ```
  The following are the EXACT asset names in this system. When specifying entryPoints or impactedAssets,
  you MUST use names from this list verbatim — do not paraphrase, abbreviate, or rephrase:
  [asset names here]
  ```
- Apply the same instruction and the same asset name list to `evidenceRefs` fields.

**On resolution failure:**
- After mapping LLM-returned names through `assetNameToId`, if any name misses, log a warning:
  ```ts
  logger.warn({ threatId, unresolvedName }, 'Entry point name not found in asset map — skipping');
  ```
- If ALL entry points for a threat resolve to 0, log a warning and skip BFS for that threat entirely. Do not use impacted assets as a fallback.

---

## P1 — Important Fixes

---

### Issues M6 + M7 — Generic 500s for Constraint Violations

> **Finding:** `POST /users` with duplicate email returns 500 instead of 409. `POST /projects/:projectId/runs` with non-existent project returns 500 instead of 404.

**Decision:** Catch Prisma constraint errors in the global error handler in `create-app.ts`. No per-route try/catch needed — let errors bubble naturally.

**Instructions for backend agent (`src/core/http/create-app.ts`):**

In the existing `setErrorHandler`, add Prisma error handling before the generic 500 fallback:

```ts
import { Prisma } from '@prisma/client';

// Inside setErrorHandler:
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') {
    return reply.status(409).send({ error: 'A record with this value already exists.' });
  }
  if (error.code === 'P2003' || error.code === 'P2025') {
    return reply.status(404).send({ error: 'Related resource not found.' });
  }
}
```

Do NOT add try/catch to any individual route handlers for these cases.

---

## P2 — Data Quality

---

### Issue M4 — `impact_breakdown` Always NULL on Threats

> **Finding:** `Threat.impact_breakdown` column exists but is never populated — the LLM schema in the threats worker doesn't include it.

**Decision:** Add `impactBreakdown` to the Gemini structured output schema and persist it.

**Instructions for backend agent (`src/workers/threats.worker.ts`):**

Add to the Gemini response schema for each threat:
```ts
impactBreakdown: {
  safetyImpact: 'negligible' | 'marginal' | 'critical' | 'catastrophic',
  financialImpact: 'negligible' | 'marginal' | 'significant' | 'severe',
  operationalImpact: 'negligible' | 'degraded' | 'loss_of_function' | 'complete_loss',
}
```

Write the returned value to `impact_breakdown` on the `Threat` record.

---

### Issue M5 — `asil_level` Always NULL on Safety Functions

> **Finding:** Safety functions are extracted with names like "Emergency braking (ASIL-D)" but the ingestion LLM schema has no `asilLevel` field — the value is never parsed into the DB column.

**Decision:** Add `asilLevel` to the ingestion LLM extraction schema. Add a regex fallback for when the LLM omits it but the name contains an ASIL designation.

**Instructions for backend agent (`src/modules/ingestion/ingestion.service.ts`):**

- Add `asilLevel: z.enum(['A', 'B', 'C', 'D', 'QM']).optional()` to the `SafetyFunction` object in the Gemini structured output schema.
- After receiving LLM output, for any safety function where `asilLevel` is missing, apply:
  ```ts
  const asilMatch = sf.name.match(/ASIL[- ]?([ABCD]|QM)/i);
  const asilLevel = sf.asilLevel ?? (asilMatch ? asilMatch[1].toUpperCase() : null);
  ```
- Write the resolved value to `asil_level` when creating the `SafetyFunction` record.

---

### Issue m2 — Safety Functions Only Linked to First Asset

> **Finding:** `sf.linkedAssetNames[0]` — only the first linked asset gets a FK relationship. The schema has a single `assetId` FK on `SafetyFunction` with no join table.

**Decision:** Create one `SafetyFunction` row per linked asset. No schema changes.

**Instructions for backend agent (`src/modules/ingestion/ingestion.service.ts`):**

Replace the single-link code with a loop:
```ts
for (const assetName of sf.linkedAssetNames) {
  const assetId = assetNameToId.get(assetName);
  if (!assetId) {
    logger.warn({ safetyFunctionName: sf.name, assetName }, 'Linked asset not found — skipping');
    continue;
  }
  await prisma.safetyFunction.create({
    data: { runId, assetId, name: sf.name, asilLevel, metadata: sf.metadata ?? null }
  });
}
```

---

### Issue m1 — `evidence_refs.assetIds` Always Empty on Threats

**Decision:** No separate fix. The C3 prompt instruction (pass exact DB asset names, instruct LLM to use verbatim) covers `evidenceRefs` as well. Apply the same asset name list and instruction to the `evidenceRefs` field in the threats prompt.

---

## P3 — Hardening

---

### Flag 2 — NVD API Error Handling Minimal

> **Finding:** Rate limit retries once then returns empty with no logging. Transient errors are silently swallowed.

**Decision:** Add exponential backoff with 3 retries on 429s. Log a warning per retry. On final failure, log an error and return empty CVE list for that software instance — do not fail the entire CVE step.

**Instructions for backend agent (`src/workers/cves.worker.ts`):**

```ts
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const delay = 1000 * 2 ** attempt; // 1s, 2s, 4s
      logger.warn({ url, attempt }, `NVD rate limit hit, retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return res;
  }
  throw new Error(`NVD API failed after ${retries} retries: ${url}`);
}
```

Wrap all NVD fetch calls with `fetchWithRetry`. On the thrown error, catch it at the software instance level, log the error with the instance name and CPE, and continue to the next instance.

---

## Deferred (No Action This Iteration)

- **Pagination on run list endpoints** — deferred, see DEFERRED-TODOS.md
- **HEAVENS automotive keyword gate** — deferred, see DEFERRED-TODOS.md
- **Attack path BFS candidate pruning** — deferred, see DEFERRED-TODOS.md
- **Fuzzy asset name matching** — deferred in favour of prompt instruction approach first, see DEFERRED-TODOS.md
- **Issue #7 (Export)** — still deferred
- **Issue #8 (Auth)** — still deferred
- **Issue #13 (Error handler shape)** — still deferred
- **CVE Tier 2 (pgvector semantic matching)** — still deferred per DEFERRED-TODOS.md
- **M2 (Pagination)** — deferred, see DEFERRED-TODOS.md

---

## Schema Changes

No new tables or columns required this iteration. All fields being populated (`impact_breakdown`, `asil_level`) already exist in the schema from iteration 2.

**No migration needed.**
