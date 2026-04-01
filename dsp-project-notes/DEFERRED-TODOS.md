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

## CVE Matching — Tier 2 (Contextual / Semantic Search)

**What:** A second CVE matching tier that uses embedding-based semantic search instead of exact CPE matching. Catches CVEs for software that has no clean CPE string (custom forks, internal tools, proprietary stacks).

**How it works:**
1. A one-time **seed job** (`src/jobs/seed-cve-embeddings.ts`) downloads CVE descriptions from the NVD API (~200K CVEs), embeds each description using Gemini's `text-embedding-004`, and bulk inserts the vectors into a `cve_embeddings` Postgres table (requires pgvector extension).
2. At **run time**, the CVE matching worker embeds each `SoftwareInstance` description via Gemini, then runs a cosine similarity query against `cve_embeddings` to find semantically similar CVE descriptions.
3. Results are merged with Tier 1 (exact/near CPE) matches, deduplicated by `cveId`, and flagged with `uncertainty_label` since they're fuzzier.

**Pre-requisites to build:**
- `CREATE EXTENSION IF NOT EXISTS vector` in Postgres
- `CveEmbedding` table in Prisma schema: `cveId String`, `description String`, `embedding Unsupported("vector(768)")`
- Seed script: paginated NVD API fetch → Gemini embed → bulk insert (idempotent, supports `--since` flag for incremental updates)
- pgvector index: `CREATE INDEX ON cve_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- NVD API key (free registration: https://nvd.nist.gov/developers/request-an-api-key) — stored as `NVD_API_KEY` env var
- Match score threshold: start with 0.6 cosine similarity, tune later

**Why deferred:** Tier 1 (exact/near CPE matching via NVD API) covers the primary use case. Tier 2 adds value for edge cases (custom/internal software with no CPE) but requires significant infra work (pgvector, seed job, embedding costs). Ship Tier 1 first, validate, then add Tier 2.

---

## Auth Layer

**What:** Authentication and authorization middleware for all routes. Role-based access: `owner` / `analyst` for writes, all roles for reads.

**Why deferred:** Full pipeline must be working end-to-end first. Auth mechanism (JWT, session, API key) not yet decided. See `backend/Iteration-1-Decisions.md #8`.

---

## Error Handler Shape Consistency

**What:** The `setErrorHandler` in `create-app.ts` returns a non-standard shape in the `else` branch (`{ message, error, statusCode }` vs the `{ error }` shape used elsewhere). No security issue — just cosmetic inconsistency.

**Why deferred:** The handler correctly returns 500 with no stack trace leakage. Shape cleanup can happen in an API consistency pass later. See `backend/Iteration-1-Decisions.md #13`.
