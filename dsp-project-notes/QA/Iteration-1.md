# Backend QA Report — Iteration 2 (Pipeline End-to-End Test)

> Date: 2026-04-02
> Test Run ID: `cmnh42tit0001ufsx4pfwqaap`
> Project: "Automotive ECU Test" (Brake-by-Wire ECU)
> Tester: Claude QA Agent

---

## Test Environment

- Node v22.15.0, tsx v4.21.0
- PostgreSQL (localhost:5432), Redis (localhost:6379)
- Gemini model: `gemini-2.5-flash`
- NVD API with key

---

## Summary

| Step | Status | Duration | Issues Found |
|------|--------|----------|-------------|
| Ingestion | PASSED | ~10s | 2 minor |
| Threats | PASSED | ~60s | 2 medium |
| CVE Matching | PASSED | ~15s | 1 critical, 1 major |
| Attack Paths | PASSED (0 results) | ~2s | 1 critical |
| Risk Scoring | PASSED | ~5s | 1 major |
| Mitigations | STILL RUNNING | 10+ min | 1 critical (perf) |

**Total issues: 12** (3 critical, 3 major, 4 medium, 2 minor)

---

## Critical Issues

### C1. `.env` file not loaded — pipeline fails silently on first run

**Where**: `src/config/env.ts`, `package.json` scripts
**What happened**: First run failed at ingestion with Gemini 403 "unregistered callers". The `GEMINI_API_KEY` env var was empty because there's no `dotenv` import and `tsx` doesn't auto-load `.env` files.
**Root cause**: `env.ts` reads `process.env.*` with empty-string defaults. No `dotenv` package is imported anywhere. Prisma happens to work because `@prisma/client` has its own `.env` loading for `DATABASE_URL`.
**Observed behavior**: `env.geminiApiKey` evaluates to `""`, the Gemini SDK sends the request without auth, returns 403.
**Workaround used**: Manually sourced `.env` before starting: `set -a && source .env && set +a && npm run dev`
**Fix**: Add `dotenv` dependency and import it at the top of `server.ts` and `worker.ts`, or use `tsx --env-file=.env` (tsx 4.x supports it), or add `--env-file=.env` to package.json scripts (Node 22 native).

---

### C2. CVE keyword fallback produces 2000+ irrelevant matches

**Where**: `src/workers/cves.worker.ts` lines 120-127
**What happened**: "Linux Kernel 5.10" keyword search returned 2000 CVEs from NVD, including completely unrelated ones (Adobe Flash Player, IBM DB2, PHP, Unreal Tournament Server, Firewall Builder). These are not Linux kernel vulnerabilities — they merely mention "Linux" somewhere in their description text.
**Root cause**: The NVD `keywordSearch` API matches ANY CVE whose description contains the keywords. "Linux" appears in thousands of CVE descriptions as a platform mention, not as the affected product. The worker stores ALL results with `matchTier: "exact"` and `matchScore: cvssScore/10`, which is misleading.
**Impact**: 
  - 2034 total CVE matches (2000 from Linux Kernel alone vs 31 OpenSSL + 3 FreeRTOS)
  - Each CVE generates a risk item (2034 CVE risk items)
  - Each risk item needs a mitigation (701 Gemini API calls in batches of 3)
  - Pipeline runtime bloats from minutes to hours
  - Mitigations generated for irrelevant CVEs waste resources

**CVE distribution per software instance**:
| Software | Version | CVE Count |
|----------|---------|-----------|
| Linux Kernel | 5.10 | 2000 |
| OpenSSL | 1.1.1k | 31 |
| FreeRTOS | 10.4.3 | 3 |

**Fix suggestions**:
1. Use `cpeName` parameter (not `keywordSearch`) for NVD API — this was already attempted as first try but fails for the Linux Kernel CPE. The CPE `cpe:2.3:o:linux:linux_kernel:5.10:*:*:*:*:*:*:*` should use `versionStartIncluding`/`versionEndExcluding` params
2. The `keywordSearch` fallback should NOT set `matchTier: "exact"` — use `"contextual"` tier instead
3. Add a `resultsPerPage` limit (e.g., 50) to the NVD API URL to cap results
4. Validate CVE relevance: filter results where the CVE's `configurations.nodes.cpeMatch` actually matches the queried product, not just keyword

---

### C3. 0 attack paths generated — BFS has no entry points to start from

**Where**: `src/workers/attack-paths.worker.ts` lines 231-295
**What happened**: Attack path step completed successfully but produced 0 paths.
**Root cause**: The BFS algorithm starts from `threat.entryPoints` (line 233: `const entryPointIds = threat.entryPoints.map((ep) => ep.assetId)`). However, the `threat_entry_points` table has **0 rows** for this run. The threats worker creates entry point links only when the LLM-returned asset name exactly matches an asset name in the DB (line 184-186 in threats.worker.ts). The LLM is returning entry point names that don't match the ingested asset names, so all `assetNameToId.get(ep)` lookups return `undefined` and no entry points are created.
**Evidence**: 
  - `threat_entry_points` count: 0
  - `threat_impacted_assets` count: 125 (impacted assets DO match — different LLM field)
  - `evidence_refs.assetIds` is always `[]` for all threats (same name-matching problem)
**Impact**: The entire attack path step produces nothing, which means risk scoring has 0 `attack_path` source type items. This is a complete loss of the attack path analysis capability.
**Fix suggestions**:
1. Add fuzzy matching for entry point names (e.g., case-insensitive, substring match)
2. Use the impacted assets as fallback entry points when no entry points resolve
3. Have the LLM return asset IDs instead of names (pass the ID→name mapping in the prompt)
4. Log a warning when entry point name resolution fails, so the issue is visible

---

## Major Issues

### M1. All risk items for threats get the same `exposureModifier` (0.6)

**Where**: `src/workers/risk.worker.ts` lines 102-104
**What happened**: Since 0 threat entry points exist (see C3), `threat.entryPoints.some(...)` always returns `false`, so `exposureModifier` is always 0.6 for all 70 threat risk items.
**Impact**: Risk scores for threats lack differentiation on exposure. All threat risk items cluster around the same scores.

---

### M2. No pagination on GET endpoints — multi-MB responses

**Where**: All `/runs/:runId/*` GET routes (threats, cves, risks, mitigations)
**Observed**:
| Endpoint | Items | Response Size |
|----------|-------|---------------|
| `/runs/:runId/cves` | 2034 | 4.4 MB |
| `/runs/:runId/risks` | 2104 | 2.0 MB |
| `/runs/:runId/threats` | 70 | ~100 KB |

No `limit`, `offset`, or cursor pagination is supported. With the CVE explosion bug (C2), this becomes a real problem for frontend consumers.

---

### M3. Mitigations step takes impractically long due to CVE volume

**Where**: `src/workers/mitigations.worker.ts` lines 101-127
**What happened**: 2104 risk items / 3 per batch = ~701 Gemini API calls. After 10+ minutes, only ~100 mitigations were generated. Extrapolating, the full mitigation step would take 1-2 hours.
**Root cause**: Downstream effect of C2 (CVE explosion). Every junk CVE creates a risk item, which requires a mitigation.
**Impact**: Pipeline cannot complete in reasonable time. Even if it does eventually complete, generating mitigations for irrelevant CVEs wastes significant Gemini API quota/cost.

---

## Medium Issues

### M4. `impact_breakdown` is always NULL on threats

**Where**: `src/workers/threats.worker.ts` — the `Threat` model has an `impactBreakdown` field, but the worker's LLM schema doesn't include it and never populates it.
**Impact**: The field is never populated, so any downstream consumer expecting it will get nothing.

---

### M5. `asil_level` is always NULL on safety functions

**Where**: `src/modules/ingestion/ingestion.service.ts` lines 248-259
**What happened**: Safety functions are extracted with names like "Emergency braking (ASIL-D)" but the `asil_level` column in the DB is never set. The extraction schema has `description` and `linkedAssetNames` but no `asilLevel` field.
**Impact**: The ASIL level information exists in the name string but isn't parsed into the dedicated column. Downstream systems can't query/filter by ASIL level.

---

### M6. Duplicate user email returns generic 500 instead of 409

**Where**: `POST /users` with duplicate email
**Observed**: Response is `{"message":"Internal Server Error","error":"Internal Server Error","statusCode":500}`
**Expected**: Should return 409 Conflict with a meaningful message.
**Root cause**: Prisma throws `P2002` (unique constraint violation) which isn't caught by the controller.

---

### M7. Run creation with non-existent project returns 500 instead of 404/422

**Where**: `POST /projects/:projectId/runs` with invalid project ID
**Observed**: Same generic 500. Prisma throws FK constraint error.
**Expected**: Should validate project exists and return 404.

---

## Minor Issues

### m1. `evidence_refs.assetIds` is always an empty array on threats

**Where**: `src/workers/threats.worker.ts` line 178
**What happened**: The LLM's `evidenceRefs` field values (strings) are stored as `assetIds` in the evidence_refs JSON, but the LLM returns reference descriptions, not actual asset IDs. The result is always an empty-looking or meaningless array.
**Impact**: No useful audit trail for what evidence supports each threat.

---

### m2. Ingestion safety functions only link to first asset

**Where**: `src/modules/ingestion/ingestion.service.ts` line 251
**Code**: `const linkedAssetName = sf.linkedAssetNames[0]` — only the first asset is used for the FK relationship.
**Impact**: Safety functions that should be linked to multiple assets only get linked to one. The remaining asset names are stored in metadata but not as proper FK relationships.

---

## Pipeline Entity Counts (Final Tally)

| Entity | Count | Assessment |
|--------|-------|------------|
| Assets | 7 | Good — matches input system description |
| Interfaces | 7 | Good — all communication channels captured |
| Trust Boundaries | 4 | Good — matches input |
| Software Instances | 5 | Good — FreeRTOS, OpenSSL, Linux Kernel, Brake Control App, Secure Boot |
| Data Flows | 7 | Good — all flows captured with correct source/target |
| Safety Functions | 3 | Good — Emergency braking, ABS, Brake force distribution |
| Threats | 70 | Good — STRIDE (52) + HEAVENS (18), well-distributed categories |
| CVE Matches | 2034 | BAD — 2000 are irrelevant Linux Kernel keyword matches |
| Attack Paths | 0 | BAD — none generated due to missing entry points |
| Risk Items | 2104 | INFLATED — 2034 from junk CVEs, 70 from threats, 0 from attack paths |
| Mitigations | ~100+ (still running) | Partially good quality, but wasted on irrelevant CVEs |

---

## What Worked Well

1. **Ingestion** — Gemini structured extraction is excellent. All 7 assets, 7 interfaces, 4 trust boundaries, 5 software instances, 7 data flows, and 3 safety functions were correctly extracted from the system description. Asset names, types, and relationships are accurate.

2. **Threat generation** — 70 threats across STRIDE and HEAVENS frameworks with good category distribution. Threat titles are specific and actionable. Impacted asset linking works correctly (125 links).

3. **Risk scoring formula** — Transparent, reproducible. Full factor breakdown stored per item. Severity bucketing is correct.

4. **Mitigation quality** — The mitigations generated so far are relevant and specific (CAN bus authentication, OBD-II access control, TLS for TCU). Control types, effort estimates, and validation steps are reasonable.

5. **API validation** — Zod schemas catch invalid input correctly with clear error messages.

6. **Pipeline orchestration** — BullMQ flow works correctly. Steps execute in the right order, parallel steps (threats + CVEs) run concurrently, and the status tracking is accurate.

7. **OpenSSL and FreeRTOS CVE matching** — 31 and 3 CVEs respectively, which are reasonable numbers. The CPE-based lookup works correctly for these.

---

## Recommendations for Iteration 3 Priority

1. **P0**: Fix `.env` loading (C1) — blocks all new developers
2. **P0**: Fix CVE keyword search explosion (C2) — cascading impact on risk, mitigations, and runtime
3. **P0**: Fix attack path entry point resolution (C3) — entire attack path capability is broken
4. **P1**: Add pagination to GET endpoints (M2)
5. **P1**: Proper error responses for FK violations (M6, M7)
6. **P2**: Populate `asil_level` and `impact_breakdown` fields (M4, M5)
7. **P2**: Fix safety function multi-asset linking (m2)
