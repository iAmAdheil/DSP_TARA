# Deferred TODOs

> Work items that were **explicitly discussed and intentionally deferred** — not forgotten, just not worth building yet.
>
> **What belongs here:**
> - Features, improvements, or fixes that were discussed and consciously pushed to a later iteration
> - Items that depend on the core pipeline being stable first
> - Items with clear pre-requisites or infra work that doesn't justify the cost right now
>
> **What does NOT belong here:**
> - Assumptions or guesses (those go in `ASSUMPTIONS.md`)
> - Decisions already made (those go in `backend/Iteration-1-Decisions.md`)
> - Bugs or issues that need fixing now (those go in iteration findings docs)
> - Vague "nice to have" ideas with no discussion behind them

---

## V1 — Required Before Demo

> Must be in place before the product can be meaningfully demonstrated to any stakeholder. These are gaps that make the product feel broken or incomplete, not polish items.

---

### Pipeline Step Bar Alignment (Frontend + Backend)

**What:** The `PIPELINE_STEPS` array in `Shell.tsx` shows 7 steps in the progress bar, but the backend pipeline only emits 6 step keys (`ingestion`, `threats`, `cves`, `attack_paths`, `risk`, `mitigations`). The `Explore` step (index 1) has no matching backend key and is currently treated as a mirror of `ingestion` status.

**Pre-requisites to build:**
- Backend emits an `assets` or `explore` step key in `run.steps` after ingestion completes (separate step or sub-step of ingestion)
- Frontend `PIPELINE_STEPS` updated to match the new key

**Why deferred:** Requires a backend schema change to `run.steps` JSON default and the orchestrator. Not worth breaking the pipeline contract for a cosmetic progress bar alignment. Revisit when the pipeline step model is extended.

---

### Auth Layer

**What:** Authentication and authorization middleware for all routes. Role-based access: `owner` / `analyst` for writes, all roles for reads.

**Why deferred:** Full pipeline must be working end-to-end first. Auth mechanism (JWT, session, API key) not yet decided. See `backend/Iteration-1-Decisions.md #8`.

---

### Export Worker — Basic File Generation (JSON + Markdown)

**What:** Replace the export worker stub with real JSON and Markdown file generation. Currently generates a JSON summary as a base64 data URL — no real files, no real storage.

**What needs building:**
- JSON: full structured `RunExport` serialization to file
- Markdown: template-based report rendering with sections per artifact type
- Store output and expose via `GET /runs/:runId/exports`

**Why deferred:** Core pipeline (steps 1–6) must be functional end-to-end first. Export is manually triggered after the pipeline completes — not blocking pipeline work.

---

### Threat Status Management — Mark as Valid / Reject

**What:** Per-threat status buttons (`Mark as Valid`, `Reject`) on the ThreatGeneration page, allowing analysts to triage individual threats before downstream analysis.

**Pre-requisites to build:**
- `status` column on the `Threat` model (e.g. `enum ThreatStatus { pending, valid, rejected }`)
- Prisma migration
- `PATCH /runs/:runId/threats/:threatId` endpoint accepting `{ status: ThreatStatus }`
- Frontend: reinstate the action buttons on threat cards, wire to the new endpoint, show status badge

**Why deferred:** Requires backend schema change and new endpoint. The core pipeline must be stable and producing quality output before triage UI adds value. Threat triage without good threat generation is noise.

---

## V2 — Enterprise-Grade

### CVE Matching — Duration and API Call Audit

**What:** The CVE matching step took **22 minutes 18 seconds** on the Brake-by-Wire QA run (49 threats, 11 assets, 3 versioned software components). This is too long for a responsive pipeline and needs investigation before real-scale runs.

**What needs auditing:**
- Count of outbound NVD API calls per run — how many requests fire, at what rate, and whether they are batched or sequential per software instance
- Count of Gemini calls (`fetchWhyRelevant`) — currently one batch call per software instance; with 49 threats the batching strategy may be re-issuing calls redundantly
- Identify the dominant time cost: NVD network latency, Gemini latency, or sequential per-threat iteration
- Check if the CVE worker iterates over threats (O(threats × software_instances)) rather than software instances alone (O(software_instances)) — if so, it explains the blow-up with 49 threats

**Why deferred:** 22 minutes is acceptable for an early demo run. Becomes a hard blocker once systems have more software components or when CVE matching is in a critical user-facing path. Observed in QA run `cmnlfq3vc000eufvlihdmcrrn` on 2026-04-05.

---

### CVE Matching — Gemini Failure Observability

**What:** When the `fetchWhyRelevant` Gemini batch call fails (quota exceeded, model error, network timeout), the error is currently swallowed with `console.warn`. All CVEs in the affected run silently get `whyRelevant = null` with no indication to the user or any monitoring surface that AI enrichment failed.

**What needs building:**
- Structured error logging for Gemini failures in the CVE worker (error type, software instance, CVE count affected)
- A run-level warning flag (e.g. `run.warnings` JSON field or a lightweight `RunWarning` model) that records partial enrichment failures without failing the step
- Frontend: if the run has a `whyRelevant` warning flag, show a subtle banner on the CVE page ("Relevance analysis was unavailable during this run due to an AI service error")

**Why deferred:** The fallback message ("Relevance analysis not available for this run") is sufficient for V1 — users understand the absence. Structured observability matters more once the product is in regular use and silent failures become hard to diagnose. Discussed 2026-04-04.

---

### Threat Generation — Entry Point Precision (B-05)

**What:** Every STRIDE threat currently has exactly 2 entry points — the two physical endpoint assets of the crossing interface. This is because the primary resolution path (using the AI's suggested asset names) always fails silently and falls back to a mechanical rule. The AI's intent per threat is being discarded.

**What needs investigating first:**
- Add logging to capture the raw entry point names the AI returns before resolution
- Confirm whether the case-insensitive lookup is still failing (hypothesis: name mismatch or whitespace difference)

**What needs building:**
- Expand the asset name instruction in the prompt to include interface names as valid entry point references
- Once the primary path works, remove or narrow the fallback so it only fires when the AI genuinely returns no names

**Why deferred:** Entry points are populated and contextually reasonable for V1 — the crossing-based fallback is not wrong, just coarse. Precision matters more once attack path generation is stable and using entry points as BFS seeds.

---

> Required before the product can be sold or handed to a real security team. These are gaps that make the product incomplete for production use.

---

### Auth — Server-Side Sign-Out

**What:** `POST /auth/sign-out` endpoint that clears the `httpOnly` JWT cookie server-side, immediately invalidating the session.

**Current state:** Sign-out is client-side only (store cleared, navigate to `/auth`). The `httpOnly` cookie cannot be deleted from the browser — it expires naturally at 7 days (JWT expiry added in Iteration 4).

**Pre-requisites to build:**
- `POST /auth/sign-out` route in the auth module (unprotected — the client may have an expired token)
- Handler calls `reply.clearCookie("token", { path: "/" })` and returns `200 ok`
- Frontend `handleSignOut` fires this endpoint before clearing the store

**Why deferred:** With 7d JWT expiry in place, the session risk window is bounded. Add server-side sign-out when multi-user or compliance requirements demand it.

---

### Export Worker — PDF Generation + Cloud Storage

**What:** Add PDF export format and upload all generated files (JSON, MD, PDF) to S3/MinIO with real download URLs.

**What needs building:**
- PDF: HTML template → headless Chromium (Puppeteer/Playwright) → PDF file
- S3/MinIO upload, store `downloadUrl` on the `Report` record
- `GET /runs/:runId/exports` returns real download URLs

**Why deferred:** Requires cloud storage infra and headless browser tooling. JSON/MD covers demo needs; PDF is the enterprise deliverable format.

---

### Pagination on Run List Endpoints

**What:** `limit`/`cursor` pagination on `/runs/:runId/threats`, `/runs/:runId/cves`, `/runs/:runId/risks`, `/runs/:runId/mitigations`.

**Why deferred:** The CVE explosion fix brings response sizes down to manageable numbers for demo. Revisit when real production data volumes demand it.

---

### CVE Matching — Relevance Filtering via VectorDB (replaces tier model)

**What:** Replace the current NVD query approach with embedding-based semantic matching so CVE results are filtered for actual contextual relevance to the system, not just the software name.

**Background:** V1 CVE matching deliberately drops the exact/near/contextual tier model — it was never exposed to users and added complexity without clear value. V1 instead shows two sections per software component (most recent 50 from NVD, most dangerous of all time 50 from NVD), pulled live. This is honest and simple, but includes no relevance filtering — a "Linux Kernel" query returns all Linux CVEs, not just the ones relevant to an embedded automotive ECU context.

**How vectorDB matching works:**
1. A one-time **seed job** downloads CVE descriptions from NVD (~200K CVEs), embeds each using Gemini `text-embedding-004`, and bulk inserts vectors into a `cve_embeddings` Postgres table (requires pgvector extension).
2. At **run time**, the CVE worker embeds each `SoftwareInstance` description + system context, then runs a cosine similarity query against `cve_embeddings` to surface contextually relevant CVEs only.
3. The "most recent" and "most dangerous" sections are then drawn from this filtered relevant set, not the raw NVD result.

**Pre-requisites to build:**
- `CREATE EXTENSION IF NOT EXISTS vector` in Postgres
- `CveEmbedding` table in Prisma schema: `cveId String`, `description String`, `embedding Unsupported("vector(768)")`
- Seed script: paginated NVD API fetch → Gemini embed → bulk insert (idempotent, supports `--since` flag for incremental updates)
- pgvector index: `CREATE INDEX ON cve_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- NVD API key stored as `NVD_API_KEY` env var

**Why deferred:** Requires significant infra (pgvector, seed pipeline, embedding costs). V1 live NVD queries are sufficient for demo. Discussed 2026-04-03.

---

### System Input — File Upload (.arxml, .json, .yaml)

**What:** Allow users to upload existing system model files directly instead of typing free-text descriptions. `.arxml` is the standard format for automotive system models.

**Why deferred:** Free-text input covers demo needs. File upload is an enterprise workflow requirement for teams that already have their system documented in standard formats.

---

### System Input — Structured Form

**What:** A guided form-based input alternative to free text, letting users add components, connections, and trust boundaries explicitly rather than relying on AI extraction from prose.

**Why deferred:** Free-text input with AI extraction covers demo needs. A structured form adds value for precision and repeatability at enterprise scale.

---

## Future — Good to Have

> Worthwhile improvements with no firm timeline. Low urgency, no blocking dependencies on these.

---

### Editable System Model

**What:** Allow analysts to manually correct the extracted system model — add missing components, fix misclassified assets, adjust connections — without re-running the full pipeline.

**Why deferred:** Makes the model read-only output for now. Editing requires significant UI work (graph interactions) and backend support for partial re-runs. Validate AI extraction quality first; if it's consistently good, this may not be needed.

---

### HEAVENS Automotive Keyword Gate

**What:** Before making the HEAVENS secondary Gemini call, check if the system context contains automotive-domain keywords (vehicle, ECU, CAN bus, AUTOSAR, ISO 26262, etc.). Skip the call entirely for non-automotive systems.

**Why deferred:** The extra Gemini call cost is acceptable for now. Add this optimisation once we have a clearer picture of call costs across real runs.

---

### Error Handler Shape Consistency

**What:** The `setErrorHandler` in `create-app.ts` returns a non-standard shape in the `else` branch (`{ message, error, statusCode }` vs the `{ error }` shape used elsewhere). No security issue — purely cosmetic inconsistency.

**Why deferred:** The handler correctly returns 500 with no stack trace leakage. Shape cleanup can happen in an API consistency pass later. See `backend/Iteration-1-Decisions.md #13`.

---

### Attack Path BFS Candidate Pruning

**What:** After BFS produces candidate paths per threat, prune to top-N before sending to Gemini for plausibility evaluation. Rank by CVE density (CVEs along path / hop count). Cap at ~30 candidates per threat.

**Why deferred:** Not observed as a problem yet. Revisit when testing with larger, denser asset graphs.
