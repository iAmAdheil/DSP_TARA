# Backend Implementation — Iteration 2 Decisions

> Source: discussion of Iteration-1-Findings.md flagged items.
> These are binding instructions for the backend agent going into iteration 2.
> Updated live during the decision interview.

---

## Guiding Principle

Keep the implementation **idiomatic and direct**. Use framework-native patterns (Fastify plugins, typed schemas, Prisma queries). Avoid over-abstraction and unnecessary indirection. Prefer clear, readable code over clever patterns. When in doubt, do the simplest idiomatic thing that is correct.

---

## 🟡 Architectural / Clarification Issues

---

### Issue #8 — Auth Layer

> **Finding:** All routes are unauthenticated. Spec mentions authorization but no middleware exists.

**Decision:** **Defer entirely.** Auth will be added in a dedicated iteration after the full pipeline is working end-to-end. No auth middleware, no role checks in any route for now.

**Instructions for backend agent:**
- Do NOT add any auth middleware or JWT/session handling.
- Remove any placeholder authorization comments from route handlers — they add noise with no function.
- The `owner` / `analyst` role distinction in the spec is deferred. Do not model it in code yet.

---

### Issue #9 — Parallel Step Failure + Sibling Cancellation

> **Finding:** Orchestrator uses FlowProducer but does NOT manually cancel the sibling job if one of steps 2/3 fails. Gate check partially handles this but there's a race window where the sibling slips from `waiting` into `active` before `failRun` propagates.

**Decision:** **Option B — active sibling cancellation.** When a child job (step 2 or 3) fails, immediately attempt to remove the sibling from the queue before it transitions to `active`. Gate check remains as the backstop for the race window.

**Instructions for backend agent:**
- In the orchestrator worker (`src/workers/orchestrator.worker.ts`), attach a `QueueEvents` listener on both `threats-generation` and `cve-matching` queues for the `failed` event.
- On failure of either child: call `failRun(runId, failedStep, err.message)` first (so the DB is updated), then iterate the parent job's children via `flow.getFlow()` or `queue.getJob()` and call `job.remove()` on any child still in `waiting` or `delayed` state.
- Do NOT attempt to stop a child already in `active` state — that's impossible. The gate check (`assertRunActive`) at the top of each worker processor is the safety net for that case.
- Both the `waiting`-removal and the gate check must remain in place — they cover different parts of the race window.

---

### Issue #10 — `run-progress.ts` Read-Modify-Write Race on `steps` JSON

> **Finding:** Helpers do `findUnique → modify in JS → update`. Not truly atomic — concurrent workers (steps 2+3) updating different keys could race. Currently safe in practice (they write different keys), but fragile if parallelism increases.

**Decision:** **Replace with `$executeRaw` + `jsonb_set`.** Eliminates the read entirely — the update is atomic at the DB level. No stale read can overwrite a concurrent write to a different key.

**Instructions for backend agent:**
- Rewrite all four helpers in `src/utils/run-progress.ts` (`setStepRunning`, `setStepCompleted`, `failRun`, `completeRun`) to use `prisma.$executeRaw` with `jsonb_set`.
- Pattern for step status updates:
  ```ts
  await prisma.$executeRaw`
    UPDATE "Run"
    SET steps = jsonb_set(steps, ${`{${step}}`}, ${JSON.stringify(status)}::jsonb)
    WHERE id = ${runId}
  `
  ```
- `failRun` also sets `status`, `failedStep`, `errorMessage` scalar columns — those can be combined in the same `$executeRaw` statement.
- `completeRun` sets `status = COMPLETED` and `completedAt = now()` — same, single statement.
- No `findUnique` calls remain in these helpers after the rewrite.
- The rest of the codebase (non-progress-tracking DB calls) stays on the Prisma query API.

---

### Issue #11 — No Input Artifact Upload Route

> **Finding:** `POST /projects/:projectId/runs` creates a run, but there's no route to upload `InputArtifact` records. Ingestion fetches artifacts from DB but nothing creates them.

**Decision:** **Option B — artifacts inline in run creation body.** `POST /projects/:projectId/runs` accepts an `artifacts` array in the request body. Artifacts are created atomically with the run record before the orchestrator job is enqueued.

**Instructions for backend agent:**
- Update the Zod request schema for `POST /projects/:projectId/runs` to include:
  ```ts
  artifacts: z.array(z.object({
    type: z.enum(["text", "form", "file"]),
    content: z.string(),         // raw text, JSON-stringified form data, or base64 file content
    filename: z.string().optional(),
    mimeType: z.string().optional(),
  })).min(1)
  ```
- In the run creation service: use a Prisma transaction — `prisma.$transaction` — to create the `Run` and all `InputArtifact` records atomically. Only enqueue the BullMQ orchestrator job after the transaction commits successfully.
- `InputArtifact` records must be linked to the `runId` (not project-scoped). Each run owns its own artifact snapshot — consistent with D6 (always full re-run from scratch).
- No separate artifact upload route needed. No multipart handling needed for now — file content is base64-encoded string in the JSON body.

---

### Issue #12 — Missing DB Migration

> **Finding:** Schema changes (failedStep, errorMessage, steps, ReportStatus) added but only `prisma generate` was run, not `prisma migrate dev`. DB tables may not match schema.

**Decision:** **User runs migration manually.** The backend agent does not run `prisma migrate dev` — that is the user's responsibility in their local environment.

**Instructions for backend agent:**
- Do NOT run `prisma migrate dev` or `prisma db push` as part of any iteration work.
- If schema changes are required in iteration 2, add them to `prisma/schema.prisma` and run `prisma generate` only. Leave a clear comment in the PR/findings noting which migration the user must run.
- Any new schema additions must be accompanied by a migration name suggestion in the findings doc (e.g. `add_cve_embeddings_table`).

---

### Issue #13 — `create-app.ts` Error Handler Incomplete

> **Finding:** Only catches `FST_ERR_TEST` code specifically. Should catch all Fastify errors (validation, 404, etc.) and return consistent `ApiError` shape. The `else` branch returns a non-standard shape.

**Decision:** **Deferred.** The `else` branch correctly returns a 500 with no stack trace leakage. Shape inconsistency (`message` + `error` + `statusCode` vs just `{ error }`) is cosmetic. Fix when cleaning up API shape consistency in a later iteration.

**Instructions for backend agent:** No action needed on this for now.

---

### Issue #14 — No CORS Configuration

> **Finding:** Frontend will need to call APIs from a different origin in dev. `@fastify/cors` not registered.

**Decision:** **Allow all origins for now.**

**Instructions for backend agent:**
- Install `@fastify/cors` if not already present.
- Register in `create-app.ts` before any routes:
  ```ts
  await app.register(cors, { origin: true })
  ```
- `origin: true` reflects the request origin back — effectively allows all origins. Tighten to specific origins when prod frontend URL is known.

---

## 🔴 Implementation Gaps (Iteration 2 Work)

These are known stubs from iteration 1. Decisions on implementation approach to be added here as the interview progresses.

---

### Issue #1 — Ingestion (Step 1) Real Implementation

**Decision:** Free-form text input only. No fixed form fields, no file parsing for now. Ingestion is a two-source LLM structured extraction problem: project-level system context + run-level component context combined into a single LLM call that produces the canonical graph.

**Instructions for backend agent:**

**Schema changes:**
- Add `systemContext String?` field to the `Project` model in `prisma/schema.prisma`. This stores the free-form system description the user provides at project creation.
- Add `PATCH /projects/:projectId` route that accepts `{ systemContext: string }` and updates the field. This is how system context evolves over time without creating a new project.

**Artifact type changes:**
- Only `text` artifact type is supported for now. Drop `form` and `file` from the Zod enum in the run creation schema. Do not add parsing logic for them.
- Update `POST /projects/:projectId/runs` body schema: `artifacts` array items are `{ type: "text", content: string }` only.

**Ingestion worker logic (`src/workers/ingestion.worker.ts`):**
- Fetch the parent `Project.systemContext` alongside the run's `InputArtifact` records.
- Combine both into a single LLM prompt:
  - System prompt: TARA extraction instructions + output schema definition
  - User message: `[SYSTEM CONTEXT]\n{project.systemContext}\n\n[COMPONENT CONTEXT FOR THIS RUN]\n{artifacts[0].content}` (concatenate multiple artifacts if present)
- Call LLM with structured output (function calling / JSON mode) to extract:
  - `Asset[]` — name, type, subsystemTag
  - `Interface[]` — protocol, direction, endpointAssets
  - `TrustBoundary[]` — boundaryType, crossingInterfaces
  - `SoftwareInstance[]` — name, version, cpeCandidate, parentAsset
  - `DataFlow[]` — source, target, dataClassification
  - `SafetyFunction[]` — description, linkedAssets
- Write all extracted entities to DB under `runId`.
- Compute `modelQualityScore` (0–1): ratio of non-null fields across all extracted entities vs total possible fields. Simple heuristic is fine.
- Write `CanonicalModel` record linking all entities to this run.

**Scope note:** The run's artifact text should describe the focal component(s) the engineer is analyzing. The project system context provides the broader world model. The LLM uses both to infer relationships between the focal component and surrounding system.

---

### Issue #2 — Threat Generation (Step 2) Real Implementation

**Decision:** Use STRIDE as the primary framework. HEAVENS is conditional — only evaluated when the project/run scope is automotive-related. LLM determines scope from the project/run context. Gemini is the LLM. Batch 3 trust boundary crossings per LLM call to balance cost and quality.

**Instructions for backend agent:**

**LLM provider:** Gemini (use the same SDK/client as CVE embedding in step 3).

**Framework logic:**
- Always generate threats using STRIDE categories (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- Include a secondary HEAVENS evaluation pass: the LLM checks the project `systemContext` and run artifact text to determine if the system is automotive-related. If yes, generate HEAVENS-specific threats. If not, return an empty HEAVENS result.
- Store a `framework` field on each `Threat` record: `"stride"` or `"heavens"`.
- The frontend will use the presence/absence of HEAVENS threats to show/hide a framework toggle button in the UI.

**Batching:**
- Group trust boundary crossings into batches of 3.
- Each LLM call receives context for 3 crossings and returns threats for all 3.
- The prompt should clearly delineate the 3 crossings so the LLM can attribute threats to the correct crossing.
- If total crossings < 3, send them all in one call. If 7 crossings, that's 3 calls (3 + 3 + 1).

**Structured output:**
- Use Gemini's structured output / JSON mode.
- Define a response schema:
  ```ts
  {
    threats: Array<{
      crossingId: string,       // which trust boundary crossing
      category: string,         // STRIDE category
      framework: "stride" | "heavens",
      title: string,
      description: string,
      entryPoints: string[],
      impactedAssets: string[],
      confidence: number,       // 0-1, model-reported
      evidenceRefs: string[],   // asset/interface IDs
    }>
  }
  ```

**Prompt structure:**
- System prompt: TARA threat analysis instructions, STRIDE category definitions, output schema.
- User message: canonical graph context (assets, interfaces, trust boundaries) + the batch of 3 crossings to analyze.
- If HEAVENS pass: separate prompt section with automotive-specific threat categories.

---

### Issue #3 — CVE Matching (Step 3) Real Implementation

**Decision:** Tier 1 only (exact/near CPE matching via NVD API). Tier 2 (contextual/semantic via pgvector embeddings) is deferred — see `DEFERRED-TODOS.md`. Gemini is the LLM provider. NVD API key required.

**Instructions for backend agent:**

**NVD API setup:**
- Read `NVD_API_KEY` from environment. The key is free (user registers at NVD). Without it, rate limit is 5 req/30s which is too slow.
- With key: 50 req/30s — sufficient for per-run matching.
- Add rate-limit-aware fetch: respect the 50/30s window. A simple delay between calls is fine.

**Redis caching (uses the existing BullMQ Redis instance):**
- Cache NVD API responses in Redis with a 4-day TTL.
- Cache key format: `nvd:cpe:{cpeString}` for exact CPE lookups, `nvd:kw:{name}:{version}` for keyword searches.
- On cache hit: skip the NVD API call entirely, use cached CVE data.
- On cache miss: call NVD API, store the response in Redis with `EX 345600` (4 days in seconds).
- This eliminates redundant API calls when multiple runs analyze the same software stack, and protects against NVD downtime for recently queried components.

**Tier 1 matching logic (`src/workers/cves.worker.ts`):**
- Fetch `SoftwareInstance[]` for the run.
- For each software instance:
  1. Derive CPE string from `name` + `version` + `cpeCandidate` fields. If `cpeCandidate` is already populated (from ingestion LLM extraction), use it directly. Otherwise, construct a best-effort CPE: `cpe:2.3:a:*:{name}:{version}:*:*:*:*:*:*:*`.
  2. Query NVD API: `GET https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName={cpe}` for CPE matches.
  3. If CPE returns nothing, fallback to keyword search: `GET https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={name}+{version}`.
  4. Check Redis cache first (see caching section above). Only call NVD on cache miss.
- **No scoring or tier labeling.** Store the CVE data as-is from the NVD API response. The user decides relevance — e.g., if they're on version 10.3 and NVD returns a CVE for 10.2, just display it.
- Store each CVE with: `cveId`, `description`, `publishedDate`, `cvssScore` (from NVD), `affectedVersions` (from NVD CPE match data), `matchedSoftwareInstanceId` (which component triggered this match).
- Bulk insert `CVEMatch[]` to DB.

**What NOT to build (deferred):**
- No `cve_embeddings` table, no pgvector setup, no seed job, no embedding calls.
- No contextual tier matching. If a software instance has no viable CPE and keyword search returns nothing, it simply gets zero CVE matches for now.

---

### Issue #4 — Attack Path Construction (Step 4) Real Implementation

**Decision:** Plain in-memory adjacency list (no graph library — system scale is 20–30 assets). Max-hop is configurable at run level with a default of 10. LLM-assisted path evaluation (Option B) — Gemini evaluates plausibility of discovered paths.

**Instructions for backend agent:**

**Graph construction:**
- Build a plain JS adjacency list from the canonical model:
  ```ts
  type GraphNode = {
    assetId: string
    assetType: string
    trustZone: string
    criticalityTags: string[]
    softwareInstances: SoftwareInstance[]
    cves: CVEMatch[]  // attached from step 3
  }
  type GraphEdge = {
    targetAssetId: string
    protocol: string
    direction: "unidirectional" | "bidirectional"
    crossesTrustBoundary: boolean
    dataClassification: string
  }
  const graph: Map<string, { node: GraphNode, edges: GraphEdge[] }>
  ```
- Populate from DB: `Asset[]`, `Interface[]`, `TrustBoundary[]`, `SoftwareInstance[]`, `CVEMatch[]`, `Threat[]` for the run.

**Path enumeration (BFS/DFS):**
- For each threat, identify its entry point asset(s) on the graph.
- Run BFS from each entry point toward high-value targets (assets with safety-critical or high-criticality tags).
- At each hop, respect edge direction (unidirectional edges can only be traversed in their direction).
- Track trust boundary crossings along the path.
- Prune paths exceeding `maxHops` (read from run config, default 10).
- Collect all candidate paths.

**LLM plausibility evaluation (Gemini):**
- Send candidate paths to Gemini in batches for plausibility evaluation.
- Prompt includes: the path (sequence of assets + edges), CVEs at each hop, trust boundary crossings, and the system context.
- Gemini returns per-path:
  - `plausible: boolean` — is this path realistic?
  - `feasibilityScore: number` (0–1)
  - `reasoning: string` — natural-language explanation of why the path is/isn't feasible
- Filter out paths where `plausible === false`.

**Scoring (from LLM response + algorithmic factors):**
- `feasibilityScore` — from Gemini evaluation
- `impactScore` — derived from target asset criticality tags (algorithmic)
- `overallPathRisk = feasibilityScore × impactScore`
- Rank paths by `overallPathRisk` DESC.

**Output:**
- Bulk insert `AttackPath[]` to DB with: path hops, trust boundary crossing count, scores, LLM reasoning, evidence refs (threat + CVE IDs used).

**Run-level config:**
- `maxHops` — read from request body or run config. Default: 10.

---

### Issue #5 — Risk Scoring (Step 5) Real Implementation

**Decision:** Option A — every threat, CVE, and attack path becomes its own RiskItem, scored independently and ranked together. Fixed 4-factor weighted formula (no user-configurable weights for now). Each RiskItem includes its `sourceType` so the UI can distinguish attack paths from threats from CVEs.

**Instructions for backend agent:**

**RiskItem creation:**
- Create one RiskItem per `Threat`, one per `CVEMatch`, one per `AttackPath`.
- Each RiskItem stores: `sourceType` (`"threat"` | `"cve"` | `"attack_path"`), `sourceId` (FK to the source record).

**Scoring formula (fixed weights):**
```
finalScore = 0.3 × likelihood + 0.3 × impact + 0.25 × exploitability + 0.15 × exposureModifier
```

**Factor computation per sourceType:**

For `threat`:
- `likelihood` = `threat.confidence` (already 0–1 from step 2 LLM)
- `impact` = criticality lookup on `threat.impactedAssets[]` (safety-critical=0.9, normal=0.5, low=0.2; take max across impacted assets)
- `exploitability` = 0.5 (default heuristic — no CVSS available for threats)
- `exposureModifier` = 1.0 if any entry point is internet-facing, subtract 0.2 per trust boundary between entry and impacted asset

For `cve`:
- `likelihood` = 0.8 (known vulnerability exists — high baseline)
- `impact` = criticality lookup on `cveMatch.matchedSoftwareInstance` → parent asset criticality
- `exploitability` = `cveMatch.cvssScore / 10` (normalize NVD CVSS to 0–1)
- `exposureModifier` = 1.0 if asset is internet-facing, 0.6 if behind trust boundary

For `attack_path`:
- `likelihood` = `attackPath.feasibilityScore` (from step 4 LLM evaluation)
- `impact` = criticality lookup on target asset of the path
- `exploitability` = max CVSS score across all CVEs at hops along the path, divided by 10
- `exposureModifier` = 1.0 minus 0.1 per trust boundary crossed along the path (min 0.2)

**Severity buckets:**
- 0.8–1.0 → `critical`
- 0.6–0.79 → `high`
- 0.4–0.59 → `medium`
- 0.0–0.39 → `low`

**Explainability:**
- Store per-factor breakdown as JSON on each RiskItem: value, weight, contribution, and a short source label for each factor.

**No config-driven weights.** The formula above is hardcoded. Weights and bucket thresholds are constants in the scoring module. The frontend will display the formula for transparency (see `frontend/FRONTEND-TODOS.md`).

---

### Issue #6 — Mitigation Recommendation (Step 6) Real Implementation

**Decision:** Pure LLM (Gemini) for mitigation generation — no control catalog or policy store. Generate one mitigation per RiskItem. If the LLM produces the same mitigation for multiple risks, store it as-is (duplicate content is acceptable — deduplication is a UI concern, not a DB concern).

**Instructions for backend agent:**

**Mitigation generation (`src/workers/mitigations.worker.ts`):**
- Fetch all `RiskItem[]` for the run, ordered by `finalScore` DESC.
- For each RiskItem, send a Gemini call with:
  - System prompt: TARA mitigation recommendation instructions, expected output schema.
  - User message: the RiskItem details (sourceType, score, breakdown, severity), the underlying source data (threat/CVE/attack path details), and relevant canonical model context (affected assets, interfaces).
- Gemini returns per RiskItem:
  ```ts
  {
    title: string,
    description: string,
    controlType: "technical" | "process" | "policy",
    estimatedEffort: "low" | "medium" | "high",
    expectedRiskReduction: number,  // 0-1
    validationSteps: string[],      // ordered checklist
  }
  ```
- Store each `Mitigation` linked to its `RiskItem` via `linkedRisks[]` (1:1 for now, but the field is an array to support future multi-risk coverage).

**Batching:**
- Batch RiskItems in groups of 3 (same pattern as threat generation) to reduce LLM calls.
- Each batch prompt contains 3 RiskItems and returns 3 mitigations.

**Duplicate handling:**
- If the LLM returns identical mitigations for different RiskItems, store them as separate Mitigation records with the same content. Each links to its own RiskItem.
- No deduplication logic in the backend. The frontend may choose to group/collapse identical mitigations in the UI.

**No control catalog.** The LLM generates mitigations from its training data without referencing a structured control database. See `ASSUMPTIONS.md` for this assumption.

**After all mitigations are stored:** call `completeRun(runId)` to set `Run.status = COMPLETED`.

---

### Issue #7 — Export Worker (Step 7) Real Implementation

**Decision:** **Deferred entirely.** Keep the existing stub. Real file generation (JSON/MD/PDF) and storage (S3/MinIO) will be implemented after the core pipeline (steps 1–6) is functional end-to-end.

**Instructions for backend agent:** No action on this for iteration 2. Do not modify the export worker or routes.
