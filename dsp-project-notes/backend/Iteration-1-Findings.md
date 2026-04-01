# Backend Implementation — Iteration 1 Findings

> Completed: 2026-04-01
> Status: All scaffold logic implemented. Typecheck passes clean.

---

## What Was Done

### Infrastructure
- **Prisma schema**: Added `failedStep`, `errorMessage`, `steps` (JSON) to `Run` model. Added `ReportStatus` enum + `status`, `errorMessage` to `Report` model. Generated client.
- **BullMQ setup**: Created `redis-connection.ts` (shared ioredis), `queue-names.ts` (7 queues), `run-queue.ts` (Queue instances + FlowProducer).
- **Run progress helpers**: `setStepRunning`, `setStepCompleted`, `failRun`, `completeRun` — all do atomic DB updates.
- **Gate check**: `assertRunActive(runId)` — throws `RunCancelledError` if run status is `failed`.

### HTTP Layer (Routes, Controllers, Services)
- **Health**: Real DB ping check (`SELECT 1`), returns 503 if degraded.
- **Users**: `POST /users` (create with Zod validation), `GET /users/:userId` (find by ID).
- **Projects**: `POST /projects` (create with domain enum validation), `GET /projects/:projectId` (includes creator + recent runs).
- **Runs**: `POST /projects/:projectId/runs` (creates run + enqueues orchestrator job, returns 202), `GET /runs/:runId` (polling endpoint with steps map).
- **Threats/CVEs/AttackPaths/Risks/Mitigations**: Converted from POST action routes to **GET read routes** (`/runs/:runId/<entity>`). Each queries Prisma with relevant includes/joins.
- **Ingestion**: HTTP route removed (internal to orchestrator). Module retained for worker logic.
- **Exports**: `POST /runs/:runId/exports` (validates run is completed, creates Report, enqueues job, returns 202). `GET /runs/:runId/exports` (lists reports with status/downloadUrl).

### Workers (all in `src/workers/`)
- **Orchestrator** (`run-pipeline` queue): Runs ingestion inline (step 1), then uses FlowProducer to enqueue steps 2–6 as a dependency tree.
- **Threats** (`threats-generation`): Stub — creates one placeholder threat per asset.
- **CVEs** (`cve-matching`): Stub — creates one placeholder CVE match per software instance.
- **Attack Paths** (`attack-paths`): Stub — creates one attack path per threat.
- **Risk Scoring** (`risk-scoring`): Stub — scores all threats/CVEs/paths with fixed weights.
- **Mitigations** (`mitigations`): Stub — one mitigation per risk item, then calls `completeRun()`.
- **Exports** (`export-generation`): Stub — generates JSON summary, stores as base64 data URL.

### Worker Entry Point
- `src/worker.ts` — starts all 7 workers, handles SIGINT/SIGTERM graceful shutdown.
- `npm run dev:worker` / `npm run start:worker` scripts added.

---

## Flagged Items for Iteration 2

### 🔴 Must Fix

1. **Ingestion is a pure stub**: Currently creates a placeholder asset per input artifact. Real implementation needs:
   - LLM structured extraction for `text` artifacts
   - Form field → canonical type mapping
   - CSV/JSON/YAML parsing
   - Full canonical graph construction (Asset[], Interface[], TrustBoundary[], SoftwareInstance[], DataFlow[], SafetyFunction[])
   - Model quality score computation
   - Assumption register + missing-data checklist

2. **Threat Generation is a stub**: No real LLM integration. Needs:
   - STRIDE/HEAVENS framework prompt construction per trust boundary crossing
   - LLM call with structured output
   - Confidence scoring (model-reported or heuristic)
   - Coverage stats by subsystem

3. **CVE Matching is a stub**: No real NVD/embedding integration. Needs:
   - CPE derivation from software instances
   - NVD API integration (exact + near tier matching)
   - pgvector embedding search (contextual tier) — requires `cve_embeddings` table + seed job
   - `text-embedding-004` / `gemini-embedding-2-preview` integration
   - Match score thresholds and deduplication

4. **Attack Path Construction is a stub**: No real graph traversal. Needs:
   - Adjacency graph from canonical model
   - BFS/DFS traversal with trust boundary cost weighting
   - CVE exploitability scoring at each hop
   - Max-hop pruning (configurable)
   - Data flow direction enforcement

5. **Risk Scoring uses fixed weights**: No config_snapshot integration. Needs:
   - Read scoring profile from `Run.config_snapshot`
   - Proper per-factor explainability breakdown as JSON
   - Configurable severity bucket thresholds

6. **Mitigation Recommendation is a stub**: No LLM or control catalog. Needs:
   - Control catalog / policy store lookup
   - LLM-based context-specific suggestion generation
   - Multi-risk coverage (one mitigation → many risks)

7. **Export worker is a stub**: No real file generation or storage. Needs:
   - JSON: full structured `RunExport` serialization
   - Markdown: template-based report rendering
   - PDF: HTML template → headless Chromium / PDF lib
   - S3/MinIO upload for `downloadUrl`

### 🟡 Suspicious / Needs Clarification

8. **No auth layer**: All routes are unauthenticated. The spec mentions "Check authorization (owner or analyst for writes; all roles for reads)" but no auth middleware exists. Need to decide: JWT? Session? API key?

9. **Parallel step failure + sibling cancellation**: The orchestrator uses FlowProducer but does NOT manually cancel the sibling job if one of steps 2/3 fails. BullMQ doesn't auto-cancel siblings (per bullmq-notes.md). The gate check (`assertRunActive`) partially handles this (the surviving sibling will bail out at the top of its processor if the run is already failed), but there's a race window where the sibling could start work before the `failRun` DB write propagates. Good enough for now, but worth hardening.

10. **`run-progress.ts` read-modify-write on `steps` JSON**: The helpers do `findUnique → modify in JS → update`. This is not truly atomic — two concurrent workers updating different step keys could race. In practice, steps 2+3 are the only concurrent pair, and they update different keys (`threats` vs `cves`). But if we ever add more parallelism, this needs a Prisma `$executeRaw` with `jsonb_set` for true atomicity.

11. **No input artifact upload route**: `POST /projects/:projectId/runs` creates a run, but there's no route to upload `InputArtifact` records. The ingestion step fetches artifacts from DB, but nothing creates them. Needs either: a separate upload endpoint, or artifacts included in the run creation body.

12. **Missing DB migration**: Schema changes (failedStep, errorMessage, steps, ReportStatus) were added but only `prisma generate` was run, not `prisma migrate dev`. The actual DB tables may not match yet. Run migration before testing.

13. **`create-app.ts` error handler is incomplete**: Only catches `FST_ERR_TEST` code specifically. Should catch all Fastify errors (validation, 404, etc.) and return consistent `ApiError` shape. Also the `else` branch returns a non-standard shape.

14. **No CORS configuration**: Frontend will need to call these APIs from a different origin in dev. Need `@fastify/cors`.

### 🟢 Working Well / Validated

- TypeScript compiles clean (0 errors)
- Module boundaries are respected: no cross-module deep imports
- BullMQ Flow tree correctly models the pipeline dependency graph
- Step status tracking via JSON field matches the polling contract from workflow-spec.md
- Export is correctly separated from the auto-pipeline (manual trigger only, D5)
- Every run is a full fresh execution from scratch (D6)
