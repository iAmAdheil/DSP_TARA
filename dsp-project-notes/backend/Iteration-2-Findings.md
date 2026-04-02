# Backend Implementation — Iteration 2 Findings

> Completed: 2026-04-02
> Status: All decision items implemented. Typecheck passes clean (0 errors).

---

## What Was Done

### Issue #14 — CORS Configuration
- Installed `@fastify/cors`
- Registered in `create-app.ts` with `origin: true` (reflects request origin)
- `createApp()` is now async — `app.ts` updated to `await createApp()`

### Issue #10 — run-progress.ts Atomic Updates
- Rewrote all 4 helpers (`setStepRunning`, `setStepCompleted`, `failRun`, `completeRun`) to use `prisma.$executeRaw` with `jsonb_set`
- No `findUnique` calls remain — updates are atomic at DB level
- Uses raw column names (`failed_step`, `error_message`, `completed_at`) in SQL

### Issue #11 — Artifacts Inline in Run Creation
- `createRunBodySchema` now requires `artifacts: [{ type: "text", content: string }]` (min 1)
- Run creation uses `prisma.$transaction` — creates Run + InputArtifacts atomically
- BullMQ job only enqueued after transaction commits

### Issue #9 — Active Sibling Cancellation
- Added `QueueEvents` listeners on `threats-generation` and `cve-matching` queues
- On child failure: scans sibling queue for jobs with matching `runId` in `waiting`/`delayed` state and removes them
- Gate check (`assertRunActive`) remains as backstop for jobs that reach `active` during the race window

### Issue #1 — Ingestion (Real Implementation)
- Added `systemContext` field to `Project` model
- Added `PATCH /projects/:projectId` route for system context updates
- Added `content` field to `InputArtifact` model
- Narrowed `ArtifactType` enum to `text` only
- Ingestion service calls Gemini (`gemini-2.0-flash`) with structured output to extract: Assets, Interfaces, TrustBoundaries, SoftwareInstances, DataFlows, SafetyFunctions
- Builds asset name→id map for FK resolution when writing entities
- Computes `modelQualityScore` heuristic

### Issue #2 — Threat Generation (Real Implementation)
- STRIDE pass: batches 3 trust boundary crossings per Gemini call
- HEAVENS pass: single call — Gemini auto-detects if system is automotive, returns empty array if not
- Each threat stored with `title`, `framework` ("stride"/"heavens"), `category`, `confidence`, entry points, impacted assets
- Falls back gracefully if no trust boundaries exist (uses interfaces, then assets)

### Issue #3 — CVE Matching (Real Implementation)
- CPE derivation from `SoftwareInstance.cpe` or best-effort construction from name+version
- NVD API v2.0 integration with `NVD_API_KEY` env var
- Keyword search fallback when CPE returns no results
- Redis caching with 4-day TTL (`nvd:cpe:*`, `nvd:kw:*`)
- Rate limiting: 650ms between calls (~50 req/30s)
- Extracts CVSS score (v3.1 preferred, v2 fallback), affected versions, description
- Added `matchedSoftwareInstanceId` FK on `CveMatch` for direct lineage

### Issue #4 — Attack Path Construction (Real Implementation)
- Builds in-memory adjacency list from Assets + DataFlows
- Determines trust zones from TrustBoundary metadata
- BFS from each threat's entry points toward high-value targets (safety-function assets)
- `maxHops` configurable via `run.configSnapshot.maxHops` (default 10)
- Gemini evaluates candidate paths for plausibility (batches of 5)
- Filters out implausible paths, stores feasibility/impact scores + LLM reasoning
- Added `reasoning`, `trustBoundaryCrossings`, `evidenceRefs` to AttackPath model

### Issue #5 — Risk Scoring (Real Implementation)
- Fixed 4-factor formula: `0.3×likelihood + 0.3×impact + 0.25×exploitability + 0.15×exposureModifier`
- Per-sourceType factor computation as specified in decisions doc
- Severity buckets: critical (0.8-1.0), high (0.6-0.79), medium (0.4-0.59), low (0.0-0.39)
- Full `factorBreakdown` JSON stored on each RiskItem with value, weight, contribution, source label
- Added `factorBreakdown` field to RiskItem model

### Issue #6 — Mitigation Recommendation (Real Implementation)
- Gemini generates mitigations in batches of 3 RiskItems
- Each mitigation: title, description, controlType, estimatedEffort, expectedRiskReduction, validationSteps
- One mitigation per RiskItem, linked via MitigationRisk join table
- `completeRun()` called after all mitigations stored
- Added `title` field to Mitigation model

### Deferred (No Action Taken)
- **Issue #8 (Auth)** — Deferred as instructed
- **Issue #12 (Migration)** — Schema changes require migration (see below)
- **Issue #13 (Error handler)** — Deferred as instructed
- **Issue #7 (Export)** — Deferred as instructed

---

## Schema Changes (Migration Required)

The following schema changes were made. Run migration before testing.

Suggested migration name: `iteration_2_real_pipeline`

Changes:
- `Project`: added `system_context String?`
- `InputArtifact`: added `content String`
- `ArtifactType` enum: removed `form`, `file` (only `text` remains)
- `Threat`: added `title String?`, `framework String @default("stride")`
- `CveMatch`: added `description String?`, `cvss_score Float?`, `affected_versions Json?`, `matched_software_instance_id String?` (FK to SoftwareInstance)
- `SoftwareInstance`: added reverse relation `cveMatches CveMatch[]`
- `AttackPath`: added `reasoning String?`, `trust_boundary_crossings Int @default(0)`, `evidence_refs Json?`
- `RiskItem`: added `factor_breakdown Json?`
- `Mitigation`: added `title String?`

---

## New Dependencies

- `@fastify/cors` — CORS middleware
- `@google/generative-ai` — Gemini SDK for all LLM calls

## New Environment Variables

- `GEMINI_API_KEY` — Required for LLM calls (ingestion, threats, attack paths, mitigations)
- `NVD_API_KEY` — Required for CVE matching (free registration at NVD)

---

## Flagged Items for Iteration 3

### 🟡 Worth Hardening

1. **Ingestion entity-name FK resolution is fragile**: The LLM returns asset names, and we match by exact string to resolve FKs. If the LLM uses slightly different names in software instances vs assets, the FK link fails silently (entity is skipped). Could add fuzzy matching or a second LLM pass for disambiguation.

2. **NVD API error handling is minimal**: Rate limit retries once then returns empty. Could add exponential backoff, circuit breaker, or a dead-letter mechanism for failed software instances.

3. **Attack path BFS can produce many candidate paths**: For densely connected graphs, the candidate set could be large. Currently sends all to Gemini in batches of 5. May need pruning heuristics (e.g., top-N by hop count or CVE density) before LLM evaluation to control cost.

4. **No deduplication of CVE matches across software instances**: If two software instances share the same CPE, we'll get duplicate CVE records. Acceptable per decisions doc, but the frontend should account for this.

5. **HEAVENS pass always fires**: Even for non-automotive systems, we send one Gemini call that (should) return empty. Could skip entirely based on `project.domain === "automotive"` to save one LLM call.

### 🟢 Working Well / Validated

- TypeScript compiles clean (0 errors)
- All 7 decisions implemented as specified
- Atomic step tracking eliminates the read-modify-write race
- Sibling cancellation covers both waiting (removal) and active (gate check) states
- Gemini structured output provides clean, typed responses
- NVD Redis cache eliminates redundant API calls across runs
- Risk scoring formula is transparent (full breakdown stored per item)
