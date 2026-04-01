# TARA Output Generation — Workflow Spec

> Living document. Updated after each interview question.
> Status: IN PROGRESS

---

## Pipeline Overview (Draft)

```
Input Artifacts
     ↓
[1] Ingestion & Normalization  →  Canonical System Model
     ↓
[2] Threat Generation          →  Threat[]
[3] CVE Matching               →  CVEMatch[]
     ↓ (both complete)
[4] Attack Path Construction   →  AttackPath[]
     ↓
[5] Risk Scoring               →  RiskItem[]
     ↓
[6] Mitigation Recommendation  →  Mitigation[]
     ↓
[7] Export / Report            →  JSON | MD | PDF
```

---

## Open Questions (to resolve in interview)

- [x] Is the pipeline triggered all-at-once or step-by-step by the user? → **RESOLVED**
- [x] Sequential vs parallel execution (e.g. threats + CVEs in parallel)? → **RESOLVED**
- [x] Job queue: what queuing mechanism, how many workers? → **RESOLVED**
- [x] Run status: how does frontend track progress? → **RESOLVED**
- [x] Partial failure handling: what happens if step 3 fails? → **RESOLVED**
- [x] What triggers export — automatic after pipeline, or manual? → **RESOLVED**
- [x] Re-run: which steps are recomputed vs cached? → **RESOLVED**

---

## Decisions (finalized)

### D1 — Pipeline Trigger Model
**Decision:** Single "Run" button per input set triggers the full pipeline end-to-end automatically.

- User configures inputs for the project (text / form / files)
- Clicks one "Run" button → creates a new `Run` record with status `queued`
- All 7 pipeline stages execute automatically without further user action
- User monitors progress and reviews results when pipeline completes

**Implication:** Frontend needs a live progress mechanism (resolved — D2). Backend must handle the full pipeline as a job/queue unit.

### D2 — Progress Tracking
**Decision:** Frontend polls `GET /runs/:runId` on a fixed interval (every ~3s) to track pipeline progress.

- `Run` object exposes `status` + `current_step` + per-step status map
- Frontend polls while `status === "running"`, stops when `completed` or `failed`
- Step-level granularity: each of the 7 steps has its own status field (`pending` | `running` | `completed` | `failed`)

**Run progress shape:**
```json
{
  "run_id": "...",
  "status": "running",
  "current_step": "threats",
  "steps": {
    "ingestion":     "completed",
    "threats":       "running",
    "cves":          "pending",
    "attack_paths":  "pending",
    "risk":          "pending",
    "mitigations":   "pending",
    "export":        "pending"
  }
}
```

**Implication:** No websocket/SSE infra needed. Backend must keep `Run.steps` updated atomically as each step transitions.

### D3 — Partial Failure Handling
**Decision:** Hard stop. Any step failure marks the entire run as `failed` immediately. No partial results are surfaced from incomplete runs.

**Behavior:**
- Step fails → set `Run.status = "failed"`, `Run.failed_step = "<step_name>"`, `Run.error_message = "<reason>"`
- All subsequent steps are cancelled / never started
- Frontend polls, sees `status: "failed"`, displays which step failed and the error message
- User must start a new Run to retry (full pipeline re-runs from scratch)

**Applies to all steps equally** — including Ingestion (step 1). No step is treated as optional or skippable.

**Implication:** Backend needs no retry logic, no partial-result stitching. `Run` object needs `failed_step` and `error_message` fields.

### D4 — Parallel Execution of Steps 2 + 3 via BullMQ
**Decision:** Steps 2 (Threat Generation) and 3 (CVE Matching) run in parallel using BullMQ's Flow (parent/child job model). All other steps are sequential.

**How it works:**
- BullMQ `FlowProducer` is used to define the pipeline as a job tree
- The parent job (`run-orchestrator`) manages the full pipeline lifecycle
- After step 1 completes, the orchestrator enqueues two child jobs simultaneously:
  - `threats-job` → processed by a `threats` worker
  - `cves-job` → processed by a `cves` worker
- The orchestrator waits for **both** children to reach `completed` before enqueuing step 4
- If either child fails → D3 applies: parent marks `Run.status = "failed"`

**BullMQ queue layout:**
```
Queue: run-pipeline       → orchestrator worker   「1 job per Run」
Queue: threats-generation → threats worker        「concurrency: N」
Queue: cve-matching       → cve worker            「concurrency: N」
Queue: attack-paths       → attack-paths worker
Queue: risk-scoring       → risk worker
Queue: mitigations        → mitigations worker
Queue: export-generation  → export worker
```

**Worker concurrency:** Each queue worker can run with `concurrency: 2` initially (safe for demo scale). The orchestrator worker itself has `concurrency: 1` per run to keep state transitions simple.

**Implication:** Redis required as BullMQ backend. Export queue/worker exists but is only triggered on-demand, not by the orchestrator.

### D5 — Export Trigger
**Decision:** Export is always manual. It is NOT part of the auto pipeline.

**Behavior:**
- Pipeline completes after step 6 → `Run.status = "completed"`
- User reviews results in the UI, then explicitly clicks "Export"
- Frontend calls `POST /runs/:runId/exports` with desired format 「`json` | `md` | `pdf`」
- Export job is enqueued separately in BullMQ (`export-generation` queue)
- Frontend polls `GET /runs/:runId/exports` to check export status and retrieve download URL

**Implication:** `Run.status = "completed"` does NOT imply exports exist. Export is a separate `Report` entity with its own lifecycle. Pipeline worker never touches the export queue.

### D6 — Re-run Strategy
**Decision:** Every run is a full fresh pipeline execution from step 1. No caching, no diffing, no incremental computation.

**Behavior:**
- User clicks "Run" on a project (even if a previous run exists) → creates a brand new `Run` record
- All 7 pipeline steps execute from scratch against the current input artifacts
- Previous runs are preserved in history — they are never mutated
- No dependency on prior run state

**Implication:** No input fingerprinting, no cache invalidation logic, no step-level diff tracking needed. Each `Run` is a fully self-contained snapshot. `FlowProducer` + `FlowJob` types from BullMQ. Step 2+3 child jobs must write their results back to the DB so the orchestrator can read them before enqueuing step 4.

---

## Step-by-Step Workflow Specs

### Full Pipeline Execution Flow

```
User clicks "Run Analysis"
  → POST /projects/:projectId/runs
  → Run created: { status: "queued", steps: { all: "pending" } }
  → Job enqueued on BullMQ run-pipeline queue

Orchestrator worker picks up job
  ↓
[STEP 1] Ingestion & Normalization
  - Run.steps.ingestion = "running"
  - Parse input artifacts → build canonical system graph
  - Write CanonicalModel to DB
  - Run.steps.ingestion = "completed"
  ↓
[STEP 2 + 3] — BullMQ FlowProducer spawns two child jobs simultaneously:
  ├─ [STEP 2] Threat Generation (threats-generation queue)
  │    - Run.steps.threats = "running"
  │    - LLM threat hypothesis generation over canonical graph
  │    - Write Threat[] to DB
  │    - Run.steps.threats = "completed"
  │
  └─ [STEP 3] CVE Matching (cve-matching queue)
       - Run.steps.cves = "running"
       - CPE derivation → NVD query → tier matching
       - Write CVEMatch[] to DB
       - Run.steps.cves = "completed"

  Orchestrator waits for BOTH children before proceeding.
  If either fails → Run.status = "failed", Run.failed_step = "<step>", halt.
  ↓
[STEP 4] Attack Path Construction
  - Run.steps.attack_paths = "running"
  - Graph traversal over canonical model + threats + CVEs
  - Write AttackPath[] to DB
  - Run.steps.attack_paths = "completed"
  ↓
[STEP 5] Risk Scoring & Ranking
  - Run.steps.risk = "running"
  - Score threats/CVEs/paths using configurable weight formula
  - Write RiskItem[] to DB (sorted by final_score)
  - Run.steps.risk = "completed"
  ↓
[STEP 6] Mitigation Recommendation
  - Run.steps.mitigations = "running"
  - Generate mitigation candidates per top-ranked risk items
  - Write Mitigation[] to DB
  - Run.steps.mitigations = "completed"
  ↓
Run.status = "completed"
  ← Frontend polls GET /runs/:runId, sees status: completed, stops polling

--- USER ACTION REQUIRED BELOW ---

User reviews results, clicks "Export"
  → POST /runs/:runId/exports  { format: "json" | "md" | "pdf" }
  → Export job enqueued on BullMQ export-generation queue
  → Export worker generates file, uploads to storage, writes Report to DB
  → Frontend polls GET /runs/:runId/exports → gets download_url
```

### Run Object Schema (final)
```typescript
{
  run_id: string
  project_id: string
  initiated_by: string
  status: "queued" | "running" | "completed" | "failed"
  started_at: datetime
  completed_at: datetime | null
  failed_step: string | null          // D3
  error_message: string | null        // D3
  steps: {
    ingestion:    StepStatus
    threats:      StepStatus          // D4: parallel
    cves:         StepStatus          // D4: parallel
    attack_paths: StepStatus
    risk:         StepStatus
    mitigations:  StepStatus
  }
  model_version: string
  config_snapshot: object
}

type StepStatus = "pending" | "running" | "completed" | "failed"
```

### BullMQ Queue Registry
| Queue | Worker | Triggered by |
|---|---|---|
| `run-pipeline` | orchestrator | `POST /runs` |
| `threats-generation` | threats worker | orchestrator FlowProducer |
| `cve-matching` | cve worker | orchestrator FlowProducer |
| `attack-paths` | attack-paths worker | orchestrator (sequential) |
| `risk-scoring` | risk worker | orchestrator (sequential) |
| `mitigations` | mitigations worker | orchestrator (sequential) |
| `export-generation` | export worker | `POST /runs/:id/exports` |

### Frontend Polling Contract
- Start polling on `POST /runs` response
- Poll `GET /runs/:runId` every ~3s
- Stop when `status === "completed"` or `status === "failed"`
- On `failed`: display `failed_step` + `error_message`
- Export: separate poll on `GET /runs/:runId/exports` until `download_url` present
