# QA Findings — Threat Generation (Iteration 2)

**Run date:** 2026-04-04  
**Tester:** Claude Code (Senior QA/Design)  
**Test run ID:** `cmnk91d06000bufb7gwdo57yh`  
**Project:** ADAS TARA — QA Iteration 2 (domain: automotive)  
**Input system:** ADAS Control Unit (per QA instructions spec)  
**Pipeline result:** threats ✅ completed · attack_paths ❌ failed  
**Threats generated:** 46 STRIDE · 8 HEAVENS

> **Context:** All items flagged in `qa-findings-iteration-1.md` were addressed by the devs before this iteration. Results below reflect re-testing against the updated build and document which fixes held, which did not, and any new regressions.

---

## Fix Verification (from Iteration 1)

| Ref | Description | Status |
|-----|-------------|--------|
| F-01 | Non-unique short ID column | ✅ Fixed — table now shows T-001, T-002… format |
| F-02 | Sidebar desync on URL navigation | ❌ Not fixed |
| F-03 | Impact breakdown values in Title Case (CSS bug) | ✅ Fixed — `text-transform: capitalize` removed |
| F-04 | Framework field shows lowercase "heavens" in drawer | ❌ Not fixed |
| F-05 | HEAVENS category names are verbose LLM prose | ⚠️ Partially fixed — see B-02 |
| F-06 | Header layout breaks when drawer is open | ✅ Fixed — `whitespace-nowrap` added to h2 |
| F-07 | Medium/low severity badges not exercisable (ADAS input) | N/A — medium threats appeared naturally this run |
| B-01 | HEAVENS generated for non-automotive projects | ❌ Not fixed |
| B-02 | HEAVENS categories are verbose prose | ⚠️ Partially fixed — shorter now but not canonical |
| B-03 | Financial HEAVENS category absent | ✅ Fixed — "Financial damage" category present |
| B-04 | Attack paths failure not surfaced in UI | Not verified (attack_paths failed again this run; pipeline bar status not inspected) |
| B-05 | Entry points uniformly 2 per STRIDE threat | ❌ Not fixed — still exactly 2 per STRIDE threat |
| B-06 | `safetyImpact: "critical"` vocabulary concern | Not re-verified this iteration |

---

## Test Case Results

### TC-01 — Page Loads and Table Renders
**Result: ✅ PASS**

Page loads at `/threats?runId=...` with no console errors. Table renders 46 STRIDE rows (well above the 20-row threshold). Subtitle reads "46 STRIDE threats · 8 HEAVENS threats". No stuck spinner.

---

### TC-02 — Table Columns Are Correct
**Result: ✅ PASS**

Four columns: ID · Title · Category · Severity (plus chevron expand column). No Confidence column, no progress bar.

---

### TC-03 — Severity Badges Are Present and Colored
**Result: ✅ PASS**

Three distinct severity levels observed:
- `extreme` → red badge ✅
- `high` → orange badge ✅
- `medium` → yellow badge ✅ (e.g. T-019 Repudiation of V2X Messages, T-027/T-028 Eavesdropping)

`low` (green) badge still not exercised — no low-severity threats generated for this ADAS system. Same as iteration-1 observation F-07; requires a low-risk system input to verify.

---

### TC-04 — STRIDE/HEAVENS Toggle Visible
**Result: ✅ PASS**

Toggle present in page header. Default active state is STRIDE. Table shows STRIDE threats on first load.

---

### TC-05 — Toggle Switches Framework Correctly
**Result: ✅ PASS**

HEAVENS → table shows 8 HEAVENS threats, subtitle updates to "8 HEAVENS threats". STRIDE → full 46 STRIDE list returns. Open drawer closed immediately on toggle switch.

---

### TC-06 — Toggle Hidden on Non-HEAVENS Run
**Result: ❌ FAIL**

Same failure as iteration 1. DB query against the EV Charging Station TARA project (`cmnjxeons0004ufofbqvry7mo`, domain: `general_system_security`) confirms HEAVENS threats still present. B-01 (domain check not enforced at worker level) remains unfixed.

---

### TC-07 — STRIDE Category Ordering (S→T→R→I→D→E)
**Result: ✅ PASS**

Category blocks in correct order:
1. Spoofing (9 threats, T-001–T-009)
2. Tampering (9 threats, T-010–T-018)
3. Repudiation (4 threats, T-019–T-022)
4. Information Disclosure (8 threats, T-023–T-030)
5. Denial of Service (9 threats, T-031–T-039)
6. Elevation of Privilege (7 threats, T-040–T-046)

Within each group, threats ordered by confidence descending. ✅

---

### TC-08 — HEAVENS Category Ordering (H→E→A→V→N→S)
**Result: ⚠️ PARTIAL PASS**

HEAVENS table shows 4 categories:
- "Safety impact" (4 threats) — first letter S, HEAVENS position 7 → sorts first ✅
- "Operational disruption" (2 threats) — first letter O → not in HEAVENS acronym → order 99
- "Financial damage" (1 threat) — first letter F → not in HEAVENS acronym → order 99
- "Privacy breach" (1 threat) — first letter P → not in HEAVENS acronym → order 99

"Safety impact" correctly appears before the others. However, the three order-99 categories are sorted together by confidence alone, which causes threats of the same category to be non-adjacent: T-005 (Operational disruption), T-006 (Financial damage), T-007 (Privacy breach), T-008 (Operational disruption). The two Operational disruption threats are separated by Financial damage and Privacy breach — same root issue as iteration-1 TC-08.

Root cause remains B-02: HEAVENS category names are not canonical HEAVENS tokens, so most letters fail to map to the acronym.

---

### TC-09 — Row Click Opens Drawer
**Result: ✅ PASS**

Clicking any row opens the detail drawer from the right. Table content shifts left. Clicked row highlighted with left-border green accent. Animation smooth.

---

### TC-10 — Drawer Shows Correct Threat Details
**Result: ✅ PASS (with observations)**

Tested on STRIDE (T-010, Tampering) and HEAVENS (T-001, Safety impact) threats.

- Severity badge in header matches table row badge ✅
- Title section present and matches row title ✅
- Description non-empty and descriptive ✅
- Category and Framework in 2-column grid ✅
- No Confidence field visible ✅

**Observation (F-09):** Drawer header still shows 8-char CUID prefix (e.g. `cmnk9475`), not the T-001 sequential format that was introduced for the table column. The F-01 fix was applied to the table but not propagated to the drawer heading.

**Observation (F-04 not fixed):** Framework field reads `heavens` (lowercase) for HEAVENS threats. STRIDE threats display "STRIDE" (uppercase). Inconsistency unchanged from iteration-1.

---

### TC-11 — Impact Breakdown Section in Drawer
**Result: ✅ PASS**

F-03 confirmed fixed. Impact values display in lowercase as specified: `catastrophic`, `severe`, `complete loss`. The `text-transform: capitalize` CSS was removed — DOM text and rendered text now match. All three dimensions (Safety, Financial, Operational) present. Values semantically correct.

---

### TC-12 — Impacted Assets Populated
**Result: ✅ PASS (with new bug F-08)**

All threats have at least one impacted asset. STRIDE threats have 1–2 assets; HEAVENS threats 5+ assets. Asset name and kind both present.

**Bug (F-08):** The `·` separator between asset name and kind is missing. Renders as `ADAS ECU ECU` (name + kind span with only left-margin spacing) instead of `ADAS ECU · ECU`. The accessibility tree reads them concatenated: `ADAS ECUECU`. Confirmed via DOM inspection — no separator character in the HTML. Same issue affects Entry Points section (TC-13).

---

### TC-13 — Entry Points Populated
**Result: ✅ PASS (with observations)**

All threats have at least 1 entry point. STRIDE threats: 2 entry points each (crossing-based fallback). HEAVENS threats: 2+ entry points (T-001 has 2 entry points from DB query; this threat also shows 2 in the drawer).

**Observation (B-05 not fixed):** DB query on this run confirms every STRIDE threat still has exactly 2 entry points (min=2, max=2, avg=2.00). The name-based resolution path still appears to be falling through to the crossing-based fallback uniformly.

**Bug (F-08):** Same separator issue as TC-12 — entry points display name + kind span with no dot separator.

---

### TC-14 — Drawer Closes on X Button
**Result: ✅ PASS**

X button in drawer header closes the drawer. Table expands back to full width. Row highlight removed.

---

### TC-15 — No Run State
**Result: ✅ PASS**

Navigating to `/threats` (no `?runId=` param) shows: heading "No threats generated yet", subtext "Run an analysis to generate threat hypotheses from your model.", and a "Go to Model Explorer" button. No table, no drawer, no console errors.

---

## Network Request Summary

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/auth/profile` | 200 | On app load |
| GET | `/projects` | 200 | Sidebar population |
| POST | `/projects` | 201 | Project creation |
| POST | `/projects/{id}/runs` | 202 | Run creation |
| GET | `/runs/{id}` | 200 | Polled ~every 5s during pipeline |
| GET | `/runs/{id}/threats` | 200 | Single fetch on page load |

Auth remains session/cookie based. Toggle is pure client-side filtering; no extra API calls on framework switch.

---

## Own Observations

### Frontend

**F-08 — Asset and entry-point separator dot missing**
The spec and iteration-1 notes show asset display as `"ADAS ECU · ECU"` (name · kind). The rendered HTML contains no separator character — just the name element followed by a kind `<span>` with `ml-[8px]` margin. The accessibility tree reads them concatenated (`ADAS ECUECU`). This affects both the Impacted Assets and Entry Points sections in the drawer. A `·` character (or any explicit separator) needs to be added between the name and kind elements.

**F-09 — Drawer header ID not updated to T-xxx format**
The F-01 fix from iteration-1 introduced sequential T-001/T-002 IDs in the table column. The drawer header was not updated — it still displays the raw 8-char CUID prefix (`cmnk9475`). The two ID representations should be consistent: if the table uses T-001, the drawer heading should also show T-001.

**F-02 — Sidebar project context desynchronizes on URL navigation (not fixed)**
Sidebar still shows last-selected project ("EV Charging Station TARA") and "No active run." when navigating directly to a `/threats?runId=...` URL belonging to a different project. See iteration-1 F-02 for full description.

**F-04 — Framework value lowercase "heavens" in drawer (not fixed)**
Drawer Framework field still shows `heavens` for HEAVENS threats; STRIDE shows `STRIDE`. See iteration-1 F-04. The fix requires normalizing the DB value on display (e.g. `.toUpperCase()` or a display map).

---

### Backend

**B-01 — HEAVENS threats generated for non-automotive projects (not fixed)**
DB still contains HEAVENS threats under the `general_system_security` domain project. The domain guard that should skip HEAVENS generation for non-automotive projects has not been enforced. See iteration-1 B-01.

**B-02 — HEAVENS category names still not canonical HEAVENS tokens (partially fixed)**
Category names are shorter than iteration-1 ("Safety impact" vs "Safety impact on vehicle occupants and road users") but still not single-token canonical HEAVENS categories (Safety, Financial, Operational, etc.). The generated names "Safety impact", "Operational disruption", "Financial damage", "Privacy breach" cause:
- Most category first-letters (O, F, P) to fall outside the HEAVENS acronym → order 99 → same-category threats become non-adjacent in the table
- Taxonomy mismatch with the HEAVENS standard

The structured output schema needs a constrained enum to enforce canonical category names.

**B-05 — Entry points uniformly 2 per STRIDE threat (not fixed)**
All 46 STRIDE threats in this run have exactly 2 entry points. The crossing-based fallback added in iteration-1 is still the only resolution path being hit — the name-based primary lookup continues to fail. Worth adding a debug log to `resolveAssetNames` to confirm whether the primary lookup is being attempted and what names are being passed.
