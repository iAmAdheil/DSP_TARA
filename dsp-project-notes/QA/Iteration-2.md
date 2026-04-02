# Backend QA Report — Iteration 2 (Re-test After Fixes)

> Date: 2026-04-02
> Test Run ID: `cmnhjqeaj0004ufhxoa1kyhjx`
> Project: "Automotive ECU Test v2" (Brake-by-Wire ECU)
> Tester: Claude QA Agent
> Previous Report: [Iteration-1.md](./Iteration-1.md)

---

## Changes Since Iteration 1

Based on git diff, the following workers were modified:
- **threats.worker.ts**: Added `impactBreakdown` to LLM schema, asset name instruction for exact matching, warning logs for unresolved names
- **cves.worker.ts**: 3-tier waterfall (exact CPE → base CPE → keyword with `keywordExactMatch=true` + `resultsPerPage=20`), exponential backoff on 429s, per-instance error isolation
- **attack-paths.worker.ts**: (already had the BFS fix from working copy)
- **ingestion.service.ts**: Safety functions now create one row per linked asset, ASIL level extraction via regex fallback
- **risk.worker.ts, mitigations.worker.ts, orchestrator.worker.ts**: (no visible changes in behavior)

---

## Test Environment

Same as Iteration 1: Node v22.15.0, tsx v4.21.0, PostgreSQL, Redis, Gemini `gemini-2.5-flash`.
Redis NVD cache and BullMQ state were flushed before this run.

---

## Summary

| Step         | Status        | Issues Found                   | Iter 1 Comparison                       |
| ------------ | ------------- | ------------------------------ | --------------------------------------- |
| Ingestion    | PASSED        | 0 new issues                   | Improved (ASIL, multi-asset safety fns) |
| Threats      | PASSED        | 1 persisting, 1 new            | Improved (impactBreakdown populated)    |
| CVE Matching | PASSED        | 1 persisting (critical), 2 new | Partially improved (3-tier logic)       |
| Attack Paths | PASSED        | 1 new (minor)                  | Fixed (30 paths vs 0)                   |
| Risk Scoring | PASSED        | 1 persisting                   | Same                                    |
| Mitigations  | STILL RUNNING | 1 persisting (critical)        | Same (bloated by CVEs)                  |

**Total issues: 8** (1 critical, 2 major, 3 medium, 2 minor)

---

## Iter 1 → Iter 2 Comparison

| Entity | Iter 1 | Iter 2 | Delta |
|--------|--------|--------|-------|
| Assets | 7 | 8 (+HSM) | +1 |
| Interfaces | 7 | 4 (consolidated) | -3 |
| Trust Boundaries | 4 | 3 | -1 |
| Software Instances | 5 | 5 | same |
| Data Flows | 7 | 7 | same |
| Safety Functions | 3 | 9 (3 fns x 3 assets) | +6 (multi-asset fix) |
| Threats | 70 | 27 | -43 (more focused) |
| Threat Entry Points | 0 | 11 | **FIXED** |
| Threat Impacted Assets | 125 | 65 | -60 |
| CVE Matches | 2034 | 2031 | -3 (essentially same) |
| Attack Paths | 0 | 30 | **FIXED** |
| Risk Items | 2104 | 2088 | -16 |
| Mitigations (partial) | ~100 | ~69+ (still running) | same rate |

---

## Issues Fixed From Iteration 1

### [C1] `.env` file not loaded
**Status: NOT FIXED** — Still requires manual `source .env` workaround. No code changes for this.

### [C3] 0 attack paths — BFS had no entry points
**Status: FIXED** — The threats worker now includes an `assetNameInstruction` in the LLM prompt forcing exact asset name usage. Result: 11 entry points across 8 threats (was 0). BFS now produces 30 attack paths.

### [M4] `impact_breakdown` always NULL on threats
**Status: FIXED** — `impactBreakdown` added to the LLM schema. All 27 threats now have populated impact breakdowns with safety/financial/operational impact assessments.

### [M5] `asil_level` always NULL on safety functions
**Status: FIXED** — Ingestion now extracts ASIL level via regex from the description. All 9 safety function rows have correct ASIL levels (ASIL-B, ASIL-C, ASIL-D).

### [m2] Safety functions only linked to first asset
**Status: FIXED** — Ingestion now creates one SafetyFunction row per linked asset (3 functions x 3 assets = 9 rows).

---

## Persisting Issues

### [C2-PERSIST] Linux Kernel CPE still returns 2000 CVEs — CRITICAL

**Where**: `src/workers/cves.worker.ts`
**What**: The 3-tier waterfall correctly tries Tier 1 (exact CPE) first. The problem is that the NVD API legitimately returns 2000 results for `cpeName=cpe:2.3:o:linux:linux_kernel:5.10:*:*:*:*:*:*:*` — these are real Linux kernel CVEs, not keyword noise. The Tier 2/3 fixes (base CPE, keyword exact match, `resultsPerPage=20`) never execute because Tier 1 succeeds.
**Impact**: Same cascading explosion as Iter 1: 2031 CVEs → 2031 risk items → ~677 mitigation batches → hours of Gemini API calls. Mitigations for irrelevant CVEs like "Verify Absence of Adobe Flash Player Components" for a brake ECU.
**Root cause difference from Iter 1**: In Iter 1, we assumed the keyword fallback was the problem. The real problem is that the NVD has 2000+ CVEs for the Linux kernel 5.10 CPE, and the worker stores ALL of them with no cap or relevance filtering.
**Fix**: Add a `resultsPerPage` limit to the Tier 1 URL (e.g., `&resultsPerPage=50`), or add a hard cap constant (`MAX_CVES_PER_INSTANCE = 50`), or filter by CVSS severity threshold, or use the NVD `pubStartDate`/`pubEndDate` to limit to recent CVEs only.

### [M3-PERSIST] Mitigations step impractically slow

**Where**: `src/workers/mitigations.worker.ts`
**Downstream of**: C2-PERSIST. Same as Iter 1 — no code changes to mitigation batching.

### [M1-PERSIST] Threat risk items all get same `exposureModifier`

**Where**: `src/workers/risk.worker.ts` lines 102-104
**Status**: Partially improved. 11 entry points exist now (was 0), so some threats DO get differentiated exposure. But 19 of 27 threats still have no entry points (see M6-NEW below), so they all get the default 0.6.

---

## New Issues

### M6-NEW. LLM returns interface/boundary names as entry points — MAJOR

**Where**: `src/workers/threats.worker.ts`, LLM prompt + `resolveAssetNames()`
**What**: Despite the `assetNameInstruction` telling the LLM to use exact asset names, the LLM frequently returns interface names ("TCU External 4G/LTE", "TCU-Gateway Ethernet Link", "Vehicle Internal CAN Bus") or boundary names ("Gateway Firewall Boundary") in the `entryPoints` field. These don't resolve in the asset name map.
**Evidence from worker logs**:
```
[threats] "entryPoints" name not found — name="TCU External 4G/LTE"
[threats] "entryPoints" name not found — name="TCU-Gateway Ethernet Link"
[threats] "entryPoints" name not found — name="Vehicle Internal CAN Bus"
```
**Result**: 19 of 27 threats have 0 entry points. Only OBD-II and a few others resolved correctly.
**Impact**: BFS only starts from 8 threats' entry points (not all 27), missing many potential attack paths. Also affects risk scoring exposure modifier for those threats.
**Fix suggestions**:
1. Also build a combined lookup map that includes interface and boundary names, mapping them to connected assets
2. For entry points that are interface names, resolve to the assets on both ends of that interface
3. Add a fuzzy/substring matcher as fallback when exact match fails

### M7-NEW. FreeRTOS gets 0 CVEs — Tier 2/3 fallback fails — MEDIUM

**Where**: `src/workers/cves.worker.ts` Tier 2 + Tier 3 logic
**What**: 
- Tier 1 exact CPE (`cpe:2.3:o:freertos:freertos:10.4.3:*:*:*:*:*:*:*`) returned 0 from NVD
- Tier 2 base CPE (`cpe:2.3:o:freertos:freertos:*:*:*:*:*:*:*:*`) got **404** from NVD — the NVD `cpeName` parameter doesn't accept wildcards in the version field
- Tier 3 keyword used `FreeRTOS_BrakeECU` (the LLM-generated compound name) as the search term — NVD returned **404** for exact match of this made-up name
**Root cause**: 
  - Tier 2: `baseProductCpe()` sets version to `*`, but NVD rejects wildcard CPE names via the `cpeName` parameter. The `cpeName` param requires a specific CPE, not wildcards.
  - Tier 3: Uses `sw.name` which is the LLM-generated name (`FreeRTOS_BrakeECU`), not the original product name (`FreeRTOS`). The `keywordExactMatch` flag makes this fail.
**Fix**:
  - Tier 2: Use NVD `cpeMatchString` parameter instead of `cpeName` for wildcard searches, or use `keywordSearch` with the vendor:product from the CPE
  - Tier 3: Parse the product name from the CPE string (field index 4) instead of using `sw.name`. For `cpe:2.3:o:freertos:freertos:10.4.3:...`, extract `freertos` and search for that.

### m3-NEW. `impact_breakdown` uses free-text instead of enum values — MINOR

**Where**: `src/workers/threats.worker.ts` LLM schema for `impactBreakdown`
**What**: The `ImpactBreakdown` TypeScript interface defines enums:
```ts
safetyImpact: "negligible" | "marginal" | "critical" | "catastrophic"
financialImpact: "negligible" | "marginal" | "significant" | "severe"
operationalImpact: "negligible" | "degraded" | "loss_of_function" | "complete_loss"
```
But the Gemini schema uses `SchemaType.STRING` without enum constraints. The LLM returns free-text like:
```json
"safetyImpact": "Potentially high, if critical brake system commands are spoofed."
```
**Impact**: Cannot programmatically filter/sort threats by impact level. Downstream consumers expecting enum values will fail.
**Fix**: Add `enum` array to the schema definition for each impact field, matching the TypeScript interface values.

### m4-NEW. Some attack paths appear near-duplicate — MINOR

**Where**: `src/workers/attack-paths.worker.ts`
**What**: Multiple attack paths share the same start_surface → target_asset with identical feasibility scores (e.g., 3 paths from OBD-II → Main Brake ECU all scoring 0.9). The LLM even notes: "This path is a duplicate of Path 0" and "This path is identical to Path 0" in the reasoning field.
**Impact**: Inflates attack path count. 30 paths may represent only ~10-15 distinct attack vectors.
**Fix**: Deduplicate paths before storing — group by (start_surface, target_asset_id) and keep the highest-scoring one, or add a dedup step after LLM evaluation.

---

## Entity Quality Assessment

### Ingestion (Excellent)
- 8 assets correctly extracted (added HSM as new asset)
- 4 interfaces (more sensibly consolidated than Iter 1's 7)
- 3 trust boundaries with correct crossing interface mappings
- 5 software instances with valid CPEs
- 7 data flows with correct source/target and classification
- 9 safety functions with ASIL levels populated (3 functions x 3 assets)

### Threats (Good, with caveats)
- 27 threats (STRIDE: 24 = 4 per category, HEAVENS: 3 = safety only)
- All have `impact_breakdown` populated (but free-text, not enums)
- 11 entry points resolved (8 of 27 threats have entry points)
- 65 impacted asset links
- HEAVENS only generates "Safety impact" category — Financial/Operational/Privacy absent

### CVE Matching (Poor — same core problem)
- 2031 total (2000 Linux Kernel, 31 OpenSSL, 0 FreeRTOS, 0 Brake Control, 0 Secure Boot)
- All `exact` tier — Tier 2/3 never reached or failed
- Linux Kernel CVEs are real but too many and not all relevant to embedded automotive context

### Attack Paths (Good — major improvement)
- 30 paths generated (was 0 in Iter 1)
- Plausible entry surfaces (OBD-II, Central Gateway, Wheel Speed Sensor, Infotainment)
- High-value targets correctly identified (Brake Actuator, Main Brake ECU)
- Some near-duplicates present

### Risk Scoring (OK — inflated by CVEs)
- 2088 items: 27 threat, 2031 CVE, 30 attack path
- Attack path items now included (2 critical, 28 high)
- Threat scoring more varied than Iter 1 (0.6-0.77 range)

### Mitigations (Good quality, impractical volume)
- Threat mitigations are specific and actionable
- CVE mitigations are nonsensical (Adobe Flash remediation for a CAN bus ECU)

---

## Recommendations for Iteration 3

### P0 — Must Fix
1. **Cap CVEs per software instance** — Add `resultsPerPage=50` to Tier 1 NVD URL, or hard-cap stored CVEs at 50 per instance. This single change would reduce risk items from 2088 to ~130 and make mitigations completable in minutes.
2. **Fix `.env` loading** — Add `dotenv` or use `--env-file=.env` in package.json scripts.

### P1 — Should Fix
3. **Resolve interface names to assets for entry points** — Build a combined name→id map including interface→connected_assets resolution. This would increase threat entry point coverage from 8/27 to potentially 27/27.
4. **Fix Tier 2/3 CVE fallback** — Use `cpeMatchString` instead of `cpeName` for Tier 2. Parse product name from CPE for Tier 3 keyword search instead of using `sw.name`.
5. **Constrain `impact_breakdown` to enum values** — Add enum arrays to the Gemini schema.

### P2 — Nice to Have
6. **Deduplicate near-identical attack paths** before storing.
7. **Add pagination** to all GET `/runs/:runId/*` endpoints.
8. **Generate all HEAVENS categories** (Financial, Operational, Privacy) not just Safety.
