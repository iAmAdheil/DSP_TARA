# TARA Pipeline — Implementation Task Spec

> Covers every implementation task per pipeline step.
> Cross-references: `workflow-spec.md` (decisions), `bullmq-notes.md` (queue mechanics), `TARA-Entities-Workflows-IO-Spec.md` (I/O contracts).

---

## Pipeline Map

```
Input Artifacts
     ↓
[1]  Ingestion & Normalization      → CanonicalModel (DB)
     ↓
[2]  Threat Generation  ─┐          → Threat[] (DB)        ← parallel
[3]  CVE Matching        ┘→ await → CVEMatch[] (DB)        ← parallel
     ↓
[4]  Attack Path Construction       → AttackPath[] (DB)
     ↓
[5]  Risk Scoring                   → RiskItem[] (DB)
     ↓
[6]  Mitigation Recommendation      → Mitigation[] (DB)
     ↓
     Run.status = "completed"
     ── USER ACTION ──
[7]  Export / Report (manual)       → Report (storage + DB)
```

Execution model: single "Run" button triggers steps 1–6 end-to-end via BullMQ orchestrator.
Steps 2+3 run in parallel via `FlowProducer`. All others are sequential.
Step 7 is enqueued only on explicit `POST /runs/:id/exports`.

---

## Infrastructure Tasks (pre-step)

These must be complete before any step worker can run.

### INF-1 — BullMQ + Redis setup
- [ ] Install: `bullmq`, `ioredis`
- [ ] Create `src/queues/redis-connection.ts` — shared `ioredis` instance
- [ ] Create `src/queues/queue-names.ts` — constants for all 7 queue names
- [ ] Create `src/queues/run-queue.ts` — exports `Queue` instances (producer-side)
- [ ] Register graceful shutdown: `worker.close()` on SIGINT/SIGTERM

### INF-2 — Prisma schema additions for Run progress
Add to `Run` model in `prisma/schema.prisma`:
```prisma
status          RunStatus   @default(QUEUED)
failedStep      String?
errorMessage    String?
steps           Json        @default("{}")  // StepStatus map
startedAt       DateTime?
completedAt     DateTime?
```
- [ ] `RunStatus` enum: `QUEUED | RUNNING | COMPLETED | FAILED`
- [ ] `StepStatus` type: `"pending" | "running" | "completed" | "failed"`
- [ ] Run migration

### INF-3 — Run progress helper
- [ ] Create `src/utils/run-progress.ts`
  - `setStepRunning(runId, step)` — atomic DB update
  - `setStepCompleted(runId, step)` — atomic DB update
  - `failRun(runId, step, message)` — sets `status=FAILED`, `failedStep`, `errorMessage`
  - `completeRun(runId)` — sets `status=COMPLETED`, `completedAt`

### INF-4 — Gate check helper (D3 — hard stop)
- [ ] Create `src/utils/gate-check.ts`
  - `assertRunActive(runId)` — reads `Run.status`; throws `RunCancelledError` if `FAILED`
  - Import and call at the top of every worker processor before doing any work

---

## Step 1 — Ingestion & Normalization

**Goal:** Parse all input artifacts for a run and produce a normalized `CanonicalModel` graph.

> Triggered automatically by the orchestrator worker after `POST /projects/:projectId/runs`.
> No dedicated route for this step.

### Worker tasks (`src/workers/ingestion.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `ingestion` (or handled inline by orchestrator — see orchestrator note below)
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "ingestion")`
- [ ] Fetch all `InputArtifact` records for this `runId` from DB
- [ ] Parse each artifact type:
  - `text` → extract entities via LLM structured extraction
  - `form` → map structured fields to canonical types
  - `file` (CSV/JSON/YAML) → parse and normalize
- [ ] Build canonical graph:
  - Identify and write `Asset[]` — name, type, subsystem tag
  - Identify and write `Interface[]` — protocol, direction, endpoints
  - Identify and write `TrustBoundary[]` — boundary type, crossing interfaces
  - Identify and write `SoftwareInstance[]` — name, version, CPE candidate, parent asset
  - Identify and write `DataFlow[]` — source, target, data classification
  - Identify and write `SafetyFunction[]` — linked assets
- [ ] Compute `modelQualityScore` (0–1) based on completeness of extracted fields
- [ ] Write `CanonicalModel` record to DB with `runId`
- [ ] Write assumption register (list of inferred values) to DB
- [ ] Write missing-data checklist to DB
- [ ] `setStepCompleted(runId, "ingestion")`
- [ ] On any error: `failRun(runId, "ingestion", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `CanonicalModel` | INSERT |
| `Asset` | INSERT many |
| `Interface` | INSERT many |
| `TrustBoundary` | INSERT many |
| `SoftwareInstance` | INSERT many |
| `DataFlow` | INSERT many |
| `SafetyFunction` | INSERT many |
| `Run` | UPDATE steps.ingestion, status |

---

## Step 2 — Threat Generation (parallel with step 3)

**Goal:** Generate threat hypotheses over the canonical model using STRIDE/HEAVENS framework.

> Steps 2 and 3 are both enqueued by the orchestrator after step 1 completes.
> They run independently and write their own DB records.
> Orchestrator proceeds to step 4 only after both complete (D4).

### Worker tasks (`src/workers/threats.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `threats-generation`
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "threats")`
- [ ] Fetch `CanonicalModel` + `Asset[]` + `Interface[]` + `TrustBoundary[]` for `runId`
- [ ] For each trust boundary crossing / exposed interface:
  - Construct LLM prompt with system context + threat framework config
  - Call LLM (structured output / function calling)
  - Parse response into `Threat` shape
- [ ] For each generated threat:
  - Validate required fields: `category`, `entryPoints[]`, `impactedAssets[]`
  - Assign `confidence` score (model-reported or heuristic fallback)
  - Map `evidenceRefs[]` to source asset/interface IDs
- [ ] Bulk insert `Threat[]` to DB with `runId`
- [ ] Compute threat coverage stats by subsystem — write to `RunStats` or embedded JSON
- [ ] `setStepCompleted(runId, "threats")`
- [ ] On any error: `failRun(runId, "threats", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `Threat` | INSERT many |
| `Run` | UPDATE steps.threats |

---

## Step 3 — CVE Matching (parallel with step 2)

**Goal:** Map known CVEs to software components in the canonical model.

### Pre-requisite — CVE embedding index (one-time job, not per-run)
- [ ] Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector`
- [ ] Add `CveEmbedding` table to Prisma schema: `cveId`, `description`, `embedding vector(768)`
- [ ] Build `src/jobs/seed-cve-embeddings.ts` — one-time script:
  - Fetch CVE list + descriptions from NVD API (paginated)
  - Embed each description via Gemini `text-embedding-004`
  - Bulk insert into `cve_embeddings` table
  - Re-run periodically (e.g. weekly cron) to pick up new CVEs
- [ ] Add pgvector index: `CREATE INDEX ON cve_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`

### Worker tasks (`src/workers/cves.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `cve-matching`
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "cves")`
- [ ] Fetch `SoftwareInstance[]` for `runId` (name, version, CPE candidate)
- [ ] For each software instance:
  - **Exact / near tier**: derive CPE string → query NVD API directly → score matches
    - `exact` — CPE match confirmed
    - `near` — partial CPE match (version range overlap)
  - **Contextual tier**: embed software component description via Gemini `gemini-embedding-2-preview` → pgvector cosine similarity query against `cve_embeddings` → top-K results above threshold
  - Merge results from both tiers, deduplicate by `cveId`
  - Filter results below match-score threshold
- [ ] Enrich each match with:
  - `whyRelevant` rationale string
  - `publishedDate`
  - `matchedAssets[]` — derived from software-to-asset linkage
- [ ] Bulk insert `CVEMatch[]` to DB with `runId`
- [ ] Tag contextual-tier matches with `uncertainty_label` flag
- [ ] `setStepCompleted(runId, "cves")`
- [ ] On any error: `failRun(runId, "cves", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `CVEMatch` | INSERT many |
| `Run` | UPDATE steps.cves |
| `cve_embeddings` | populated by seed job (pre-run, not per-run) |

---

## Orchestrator — Step 2+3 Fan-Out Gate (D4)

The orchestrator worker (on `run-pipeline` queue) handles sequencing.

### Orchestrator tasks (`src/workers/orchestrator.worker.ts`)
- [ ] After step 1 completes: use `FlowProducer` to enqueue threat + CVE jobs simultaneously
- [ ] Use BullMQ Flow parent/child model: `attack-paths` job is the parent, `threats` and `cves` are its children
- [ ] Orchestrator polls (or listens via `QueueEvents`) for both children to reach `completed`
- [ ] If either child fails:
  - `failRun(runId, failedChildName, err.message)` — D3 hard stop
  - Remove the still-waiting sibling job (`job.remove()`) to prevent orphaned execution
  - Halt orchestrator
- [ ] On both children completing: enqueue step 4

> Implementation note (from `bullmq-notes.md`):
> Step 1 must run BEFORE `flow.add()` is called because BullMQ does not support a single job
> being a dependency of two parent jobs. Run step 1 in the orchestrator directly, save the
> canonical model to DB, then call `flowProducer.add()` for steps 2–7.

---

## Step 4 — Attack Path Construction

**Goal:** Build multi-step adversarial routes through the system graph.

### Worker tasks (`src/workers/attack-paths.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `attack-paths`
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "attack_paths")`
- [ ] Fetch `CanonicalModel` graph + `Threat[]` + `CVEMatch[]` for `runId`
- [ ] Build adjacency representation of canonical graph (asset → interface → asset)
- [ ] For each threat + associated CVEs:
  - Identify entry point(s) on the graph
  - Run graph traversal (BFS/DFS) toward high-value target assets
  - Enumerate feasible multi-hop routes considering:
    - Trust boundary crossings (each crossing increases cost)
    - CVE exploitability scores at each hop
    - Data flow directions (must traverse in permitted direction)
  - Prune paths exceeding a max-hop threshold (config)
- [ ] For each path:
  - Compute `feasibilityScore` (0–1) — function of CVE CVSS + hop count + boundary count
  - Compute `impactScore` (0–1) — derived from target asset safety/criticality flags
  - Compute `overallPathRisk = feasibility × impact`
  - Link `evidenceRefs[]` to threats/CVEs used
- [ ] Rank paths by `overallPathRisk` descending
- [ ] Bulk insert `AttackPath[]` to DB
- [ ] `setStepCompleted(runId, "attack_paths")`
- [ ] On any error: `failRun(runId, "attack_paths", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `AttackPath` | INSERT many |
| `Run` | UPDATE steps.attack_paths |

---

## Step 5 — Risk Scoring & Ranking

**Goal:** Produce a unified, ranked risk register from threats, CVEs, and attack paths.

### Worker tasks (`src/workers/risk.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `risk-scoring`
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "risk")`
- [ ] Fetch `Threat[]`, `CVEMatch[]`, `AttackPath[]` for `runId`
- [ ] Fetch `Run.config_snapshot` to read scoring profile weights
- [ ] For each source item (threat / cve / attack path):
  - Compute `likelihood` — based on threat confidence / CVE exploitability / path feasibility
  - Compute `impact` — based on impacted assets' criticality tags
  - Compute `exploitability` — CVSS base score (for CVEs) or heuristic (for threats)
  - Apply `exposureModifier` — based on internet-facing interfaces or missing controls
  - Compute `finalScore = weighted_sum(likelihood, impact, exploitability, exposureModifier)`
  - Assign `severity` bucket: `critical | high | medium | low` based on score thresholds
  - Store explainability breakdown: per-factor contributions as JSON
- [ ] Bulk insert `RiskItem[]` to DB, ordered by `finalScore` DESC
- [ ] `setStepCompleted(runId, "risk")`
- [ ] On any error: `failRun(runId, "risk", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `RiskItem` | INSERT many |
| `Run` | UPDATE steps.risk |

---

## Step 6 — Mitigation Recommendation

**Goal:** Generate actionable mitigation options for top-ranked risk items.

### Worker tasks (`src/workers/mitigations.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `mitigations`
- [ ] Gate check: `await assertRunActive(runId)`
- [ ] `setStepRunning(runId, "mitigations")`
- [ ] Fetch `RiskItem[]` for `runId` (ordered by `finalScore` DESC)
- [ ] Optionally filter to top-N items (configured threshold) or process all
- [ ] For each risk item:
  - Identify control types applicable to `sourceType` (threat / cve / attack_path)
  - Query control catalog / policy store (DB or embedded knowledge)
  - Use LLM to generate context-specific mitigation suggestion:
    - `controlType` — technical / process / policy
    - `estimatedEffort` — low / medium / high
    - `expectedRiskReduction` (0–1)
    - `validationSteps[]` — ordered checklist strings
  - Link `linkedRisks[]` to one or more `RiskItem` IDs (a single mitigation may cover multiple risks)
- [ ] Bulk insert `Mitigation[]` to DB with `runId`
- [ ] `setStepCompleted(runId, "mitigations")`
- [ ] Call `completeRun(runId)` — sets `Run.status = "completed"`, `completedAt = now()`
- [ ] On any error: `failRun(runId, "mitigations", err.message)` then rethrow

### DB writes this step
| Table | Operation |
|---|---|
| `Mitigation` | INSERT many |
| `Run` | UPDATE steps.mitigations, status=COMPLETED, completedAt |

---

## Step 7 — Export / Report (Manual — NOT part of auto-pipeline)

**Goal:** Generate a downloadable report in a user-selected format.

### API task
- [ ] `POST /runs/:runId/exports` — accepts `{ format: "json" | "md" | "pdf" }`
- [ ] Validate `Run.status === "completed"` — reject with 409 if not
- [ ] Insert `Report` record with `status = "queued"`
- [ ] Enqueue job on `export-generation` queue with `{ runId, reportId, format }`
- [ ] Return `202 Accepted` with `{ reportId }`
- [ ] `GET /runs/:runId/exports` — list all `Report[]` for run; frontend polls until `downloadUrl` present

### Worker tasks (`src/workers/exports.worker.ts`)
- [ ] Create BullMQ `Worker` on queue `export-generation`
- [ ] Update `Report.status = "running"`
- [ ] Fetch all run artifacts: `CanonicalModel`, `Threat[]`, `CVEMatch[]`, `AttackPath[]`, `RiskItem[]`, `Mitigation[]`
- [ ] Format-specific generation:
  - **JSON**: serialize all artifacts into structured `RunExport` shape; write to file
  - **MD**: render Markdown report with sections per artifact type; write to file
  - **PDF**: render HTML template → headless Chromium / PDF lib → write to file
- [ ] Include evidence/provenance snapshot (model version, config snapshot, artifact IDs)
- [ ] Upload generated file to S3 / MinIO
- [ ] Update `Report` in DB: `status = "completed"`, `downloadUrl = <s3-url>`, `generatedAt = now()`
- [ ] On error: update `Report.status = "failed"`, `errorMessage = err.message`

### DB writes this step
| Table | Operation |
|---|---|
| `Report` | INSERT (on enqueue), UPDATE status/url (on complete) |

---

## Fastify Route/Controller tasks

Steps 1–6 are fully internal — BullMQ handles sequencing after a single run creation call.
Only the routes below are needed.

For each route, the controller must:
- [ ] Validate request with Zod schema (type provider)
- [ ] Check authorization (`owner` or `analyst` for writes; all roles for reads)
- [ ] Use `setErrorHandler` for unhandled failures — no raw error leakage

### Runs module (`src/modules/runs/`)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/projects/:projectId/runs` | Create run + enqueue orchestrator job |
| `GET` | `/runs/:runId` | Progress polling — returns `status` + `steps` map |

### Output read routes (one per artifact module)
| Method | Path | Returns |
|---|---|---|
| `GET` | `/runs/:runId/threats` | `Threat[]` |
| `GET` | `/runs/:runId/cves` | `CVEMatch[]` |
| `GET` | `/runs/:runId/attack-paths` | `AttackPath[]` |
| `GET` | `/runs/:runId/risks` | `RiskItem[]` |
| `GET` | `/runs/:runId/mitigations` | `Mitigation[]` |

### Export module (`src/modules/exports/`)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/runs/:runId/exports` | Enqueue export job (manual trigger) |
| `GET` | `/runs/:runId/exports` | Poll export status / get `downloadUrl` |

---

## Frontend Polling Contract (summary)

| Action | Frontend behavior |
|---|---|
| `POST /runs` returns | begin polling `GET /runs/:runId` every 3s |
| `status === "running"` | show `current_step` + per-step status map |
| `status === "completed"` | stop polling; show results |
| `status === "failed"` | stop polling; display `failedStep` + `errorMessage` |
| User clicks Export | `POST /runs/:runId/exports`; poll `GET /runs/:runId/exports` until `downloadUrl` present |

---

## Worker Registry Summary

| Queue | Worker file | Concurrency | Triggered by |
|---|---|---|---|
| `run-pipeline` | `orchestrator.worker.ts` | 1 per run | `POST /runs` |
| `threats-generation` | `threats.worker.ts` | 2 | orchestrator FlowProducer |
| `cve-matching` | `cves.worker.ts` | 2 | orchestrator FlowProducer |
| `attack-paths` | `attack-paths.worker.ts` | 2 | orchestrator (sequential) |
| `risk-scoring` | `risk.worker.ts` | 2 | orchestrator (sequential) |
| `mitigations` | `mitigations.worker.ts` | 2 | orchestrator (sequential) |
| `export-generation` | `exports.worker.ts` | 2 | `POST /runs/:id/exports` |
