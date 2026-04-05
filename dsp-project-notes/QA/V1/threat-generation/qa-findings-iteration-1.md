# QA Findings — Threat Generation (Iteration 1)

**Run date:** 2026-04-04  
**Tester:** Claude Code (Senior QA/Design)  
**Test run ID:** `cmnk6gcmt0003ufb7dfmcsn0a`  
**Project:** ADAS TARA — QA Test Run (domain: automotive)  
**Input system:** ADAS Control Unit (per QA instructions spec)  
**Pipeline result:** threats ✅ completed · attack_paths ❌ failed  
**Threats generated:** 33 STRIDE · 6 HEAVENS

---

## Test Case Results

### TC-01 — Page Loads and Table Renders
**Result: ✅ PASS**

Page loads at `/threats?runId=...` with no console errors. Table renders with 33 STRIDE rows (well above the 20-row threshold). No stuck loading spinner. Subtitle reads "33 STRIDE threats · 6 HEAVENS threats".

---

### TC-02 — Table Columns Are Correct
**Result: ✅ PASS**

Table header has exactly four columns: ID · Title · Category · Severity (plus the chevron expand column). No Confidence column. No progress bar visible anywhere in rows. Columns verified via accessibility snapshot and visual screenshot.

---

### TC-03 — Severity Badges Are Present and Colored
**Result: ✅ PASS (partial coverage)**

All rows have a severity badge. Two distinct severity levels are present across the STRIDE table:
- `extreme` → red badge ✅
- `high` → orange badge ✅

No `medium` or `low` threats were generated for this ADAS system — this is expected given the safety-critical automotive context and is not a defect. The HEAVENS table shows only `extreme` badges across all 6 threats, consistent with the catastrophic impact values stored.

**Observation:** With no medium/low threats generated for this system type, the yellow and green badge colors could not be exercised. A dedicated test for badge colors would require a lower-risk non-critical system input.

---

### TC-04 — STRIDE/HEAVENS Toggle Visible
**Result: ✅ PASS**

The STRIDE/HEAVENS segmented toggle is visible in the page header. Default active state is STRIDE. The table shows STRIDE threats on first load.

---

### TC-05 — Toggle Switches Framework Correctly
**Result: ✅ PASS**

Clicking HEAVENS:
- Table refreshes to show 6 HEAVENS threats only ✅
- Subtitle updates to "6 HEAVENS threats" ✅
- All visible threats have HEAVENS-framework categories ✅

Clicking STRIDE:
- Table returns to full 33 STRIDE threat list ✅
- Subtitle returns to "33 STRIDE threats · 6 HEAVENS threats" ✅

Drawer-close-on-toggle tested: opened a STRIDE threat drawer, switched to HEAVENS — drawer closed immediately. ✅

---

### TC-06 — Toggle Hidden on Non-HEAVENS Run
**Result: ❌ FAIL**

Navigated to the EV Charging Station TARA threat page (project domain: `general_system_security`, run `cmnjxeons0004ufofbqvry7mo`). The STRIDE/HEAVENS toggle **still appears** because that run has 6 HEAVENS threats in the DB. A general security project should not have HEAVENS threats generated — this is a backend data integrity failure (see Backend Bug #1). The frontend itself is working correctly (toggle visibility is data-driven), but the underlying data is wrong.

---

### TC-07 — STRIDE Category Ordering (S→T→R→I→D→E)
**Result: ✅ PASS**

Category blocks in the UI follow the correct order:
1. Spoofing (6 threats)
2. Tampering (6 threats)
3. Repudiation (4 threats)
4. Information Disclosure (6 threats)
5. Denial of Service (6 threats)
6. Elevation of Privilege (5 threats)

Within each group, threats are ordered by confidence descending. Verified against DB values — UI ordering matches. Example (Spoofing): confidence 0.9 threats appear before 0.85 confidence threats. Tied confidence values are in arbitrary order (acceptable).

---

### TC-08 — HEAVENS Category Ordering (H→E→A→V→N→S)
**Result: ✅ PASS (with observations)**

HEAVENS table shows:
- "Safety impact on vehicle occupants and road users" (5 threats) — first letter S, order 7
- "Operational disruption of vehicle functions" (1 threat) — first letter O, order 99 (unknown letter)

The S-category (order 7) correctly appears before the O-category (order 99 — letter not in HEAVENS acronym). The ordering algorithm is functioning correctly.

**Observation:** Only 2 HEAVENS categories were generated. No H, E, A, V, or N category threats exist. The expected Financial category is absent. See Backend Bug #2 and #3.

---

### TC-09 — Row Click Opens Drawer
**Result: ✅ PASS**

Clicking any row opens the detail drawer. Drawer slides in from the right. Table content shifts left (main area shrinks). Clicked row is highlighted with a left-border green accent. Animation is smooth.

---

### TC-10 — Drawer Shows Correct Threat Details
**Result: ✅ PASS**

Tested on both a STRIDE (Spoofing, cmnk6hdp) and a HEAVENS (Safety, cmnk6ibt) threat.

- Short ID (8 chars) shown in header ✅
- Severity badge in header matches table row badge ✅
- Title section present and matches row title ✅
- Description non-empty and descriptive ✅
- Category and Framework in 2-column grid ✅
- No Confidence field visible ✅

**Observation:** Framework value in drawer reads lowercase "heavens" for HEAVENS threats. STRIDE threats show "STRIDE" (uppercase). Inconsistent casing — should both be uppercase (STRIDE / HEAVENS) or both capitalized (Stride / Heavens).

---

### TC-11 — Impact Breakdown Section in Drawer
**Result: ⚠️ PARTIAL PASS — display casing bug**

The Impact Breakdown section is present in all drawers. All three rows are shown: Safety, Financial, Operational. Values are semantically correct and non-trivially meaningful (catastrophic, severe, complete loss etc.). Underscore-to-space conversion works correctly (`complete_loss` → "complete loss"). At least one threat has non-negligible values across all three dimensions.

**Bug:** Values are displayed in Title Case ("Catastrophic", "Severe", "Complete Loss") instead of lowercase as specified ("catastrophic", "severe", "complete loss"). The underlying DOM text is correct lowercase (verified via accessibility tree) — the capitalization is applied via CSS `text-transform: capitalize` on the value element. This is a styling bug that contradicts the spec intention.

---

### TC-12 — Impacted Assets Populated
**Result: ✅ PASS**

100% of threats have at least one impacted asset. STRIDE threats have 1–2 assets per threat. HEAVENS threats have 5–10 assets (richer, as they reference full system crossings). Assets show name and kind (e.g., "ADAS ECU · ECU", "Front Radar Sensor · Sensor", "OEM Backend · Cloud Service"). Section never shows "None listed." for new runs.

---

### TC-13 — Entry Points Populated
**Result: ✅ PASS**

All 33 STRIDE threats and all 6 HEAVENS threats have at least 1 entry point (DB query confirmed 0 threats with zero entry points). The crossing-based fallback fix is working. Entry points show name and kind. STRIDE threats have 2 entry points each (both endpoints of the crossing interface). HEAVENS threats have 6–14 entry points.

---

### TC-14 — Drawer Closes on X Button
**Result: ✅ PASS**

Clicking the X button in the drawer header closes the drawer. Table expands back to full width. The row highlight is removed. Verified programmatically — IMPACT BREAKDOWN text no longer present in DOM after close.

---

### TC-15 — No Run State
**Result: ✅ PASS**

Navigating to `/threats` (no `?runId=` param) shows the empty state: "No threats generated yet" with a "Go to Model Explorer" link. No table rendered, no drawer rendered, no console errors.

---

## Network Request Summary

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/auth/profile` | 200 | On app load |
| GET | `/projects` | 200 | Sidebar population |
| POST | `/projects` | 201 | Project creation — body includes name, domain, systemContext |
| POST | `/projects/{id}/runs` | 202 | Run creation — body contains `artifacts: [{type: "text", content: "..."}]` |
| GET | `/runs/{id}` | 200 | Polled ~every 5s while pipeline is running |
| GET | `/runs/{id}/threats` | 200 | Single fetch on Threat Generation page load |

**Observation:** Auth is session/cookie based — no Authorization header visible in captured requests. The threats endpoint `GET /runs/{id}/threats` is called once on page load and not re-fetched. The toggle switch is pure client-side filtering over the initial response (no separate API calls per framework).

---

## Own Observations

### Frontend

**F-01 — Non-unique ID column (display problem)**
The ID column shows the first 8 characters of each threat's full ID. Due to ID generation timing (many threats generated in a short burst), multiple threats share the same 8-char prefix. All 6 HEAVENS threats show `cmnk6ibt`. Among STRIDE threats, only 5 unique short IDs exist for 33 threats. The ID column is visually useless for distinguishing threats — all rows show `cmnk6...` truncated further by column width. The full ID is never shown anywhere in the UI. Recommendation: either show more characters (12–16), use a human-readable sequential index (T-001, T-002…), or make the short ID at minimum guaranteed unique within a run.

**F-02 — Sidebar project context desynchronizes on URL navigation**
When navigating directly to `/threats?runId=...` for a run that belongs to a different project than the currently selected one, the sidebar continues to show the last-selected project. The "System Status" section shows the wrong project name and "No active run." even though the page is actively displaying threat data for a run. The sidebar should read the `runId` from the URL and resolve its owning project.

**F-03 — Impact breakdown values displayed in Title Case (CSS bug)**
The spec says values should display lowercase ("catastrophic", "complete loss"). Visually they render as "Catastrophic", "Complete Loss" due to `text-transform: capitalize` on the value element. The DOM text is correctly lowercase (confirmed via accessibility tree). The CSS transform should be removed from impact value elements.

**F-04 — Framework value inconsistent casing in drawer**
The Framework field in the detail drawer renders as lowercase "heavens" for HEAVENS threats but uppercase "STRIDE" for STRIDE threats. This is inconsistent. The database stores framework as lowercase (`stride`, `heavens`) and the display should normalize to a consistent presentation — either all-caps (STRIDE / HEAVENS) or title case (Stride / Heavens).

**F-05 — HEAVENS category badge overflows row height**
HEAVENS category names generated by the LLM are verbose full sentences (e.g., "Safety impact on vehicle occupants and road users"). The category badge in the table cell wraps to 3 lines, making HEAVENS rows significantly taller than STRIDE rows. This creates a jarring visual inconsistency between the two framework views. Category names should be short tokens matching the HEAVENS domain vocabulary (Safety, Operational, Financial, etc.).

**F-06 — Header layout breaks when drawer is open**
When the detail drawer is open, the page header area for the Threat Generation section compresses. The "Threat Generation" title wraps to two lines, and the STRIDE/HEAVENS toggle and other controls reflow to a second line. The header needs a min-width or the controls need to be more compact to remain on a single line with the drawer open.

**F-07 — No medium/low severity colors exercisable with ADAS input**
The yellow (medium) and green (low) severity badges are defined in the spec but cannot be visually verified with a high-risk automotive system as input. Medium and low threats simply do not appear for this system. A second test run using a low-risk web application system description would be needed to verify the full badge color spectrum.

---

### Backend

**B-01 — HEAVENS threats generated for non-automotive projects (critical)**
The EV Charging Station TARA project (domain: `general_system_security`) has runs containing 6 HEAVENS threats. HEAVENS (Hazards, Effects, and Vulnerabilities in Networked Systems) is an automotive-specific threat framework and has no business being applied to a generic security assessment. This means either the domain check that gates HEAVENS generation is not enforced, or the LLM is generating HEAVENS threats regardless of the project domain configuration. This needs to be fixed at the worker level — HEAVENS generation should be skipped when `project.domain !== 'automotive'`.

**B-02 — HEAVENS category names are verbose LLM prose, not framework tokens**
Instead of short canonical HEAVENS category names like "Safety", "Operational", "Financial", the LLM is generating full descriptive sentences: "Safety impact on vehicle occupants and road users", "Operational disruption of vehicle functions". These long strings:
- Break the table layout (category badge becomes multiline)
- Undermine the HEAVENS acronym-based category ordering (the first-letter matching happens to work, but "Operational" starts with O — not a HEAVENS letter at all, so it falls to order 99)
- Do not match the expected taxonomy

The structured output schema for HEAVENS threat categories should constrain the LLM to a fixed enum: `["Safety", "Financial", "Operational", "Hazardous Event", "Environmental", ...]` — not free text.

**B-03 — Financial HEAVENS category absent**
The QA spec expects HEAVENS threats across Safety, Operational, and Financial categories for this automotive system. Only Safety (5 threats) and Operational (1 threat) were generated. No Financial category threats appeared. With the OTA update channel, V2X communication, and OEM backend interaction, financial risk scenarios are plausible (ransomware on OTA, disruption of paid V2X services, etc.). Either the prompt needs adjustment or the LLM is not exploring the Financial dimension adequately.

**B-04 — Attack paths step failed on ADAS test run**
The ADAS test run has `status: failed` with `attack_paths: "failed"`. The Threat Generation page still works correctly since threats completed before the failure, but the failed run state is not surfaced to the user anywhere on the Threat Generation page. The pipeline step indicator in the header shows step 3 (Threats) as active/completed but gives no indication that a later step failed. A visual failure state in the pipeline progress bar would help users understand the run's overall health.

**B-05 — Entry point count uniformly 2 per STRIDE threat (possible oversimplification)**
Every single STRIDE threat has exactly 2 entry points — the two endpoint assets of the crossing interface. This is the result of the crossing-based fallback introduced in this iteration. While it passes the TC-13 criterion, it is semantically too uniform. A spoofing threat on the V2X link might have more contextually relevant entry points than just the two physical endpoints. The name-based resolution path (primary method) may still be failing (all threats falling through to the fallback), which would be worth investigating with a debug log.

**B-06 — Impact breakdown `safetyImpact: "critical"` may conflict with common usage**
The 4-level safety impact scale used is: negligible → marginal → critical → catastrophic. Having "critical" at level 3 (mapped to severity "high") is potentially confusing to automotive engineers, since "critical" is typically treated as the highest severity in many standards (ISO 26262 etc.). The severity derivation maps score 3 → "high" and score 4 → "extreme", so a "critical" safety impact only produces a "high" overall severity even if financial or operational impacts are also high. This may understate risk for "critical" safety threats. Worth aligning the vocabulary with ISO 26262 or HEAVENS severity definitions (Negligible / Marginal / Critical / Catastrophic maps correctly to ASIL A-D but the word "critical" at position 3 may mislead domain experts).
