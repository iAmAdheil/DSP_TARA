# QA — Threat Generation Page

## Feature Aim

The Threat Generation page displays all STRIDE and HEAVENS threats identified for a run. Threats are shown in a sortable table grouped by category in framework-acronym order (S→T→R→I→D→E for STRIDE). Each row shows ID, title, category badge, and severity badge. Clicking a row opens a detail drawer showing description, category, framework, impact breakdown, impacted assets, and entry points. Confidence is intentionally hidden from both the table and drawer. A STRIDE/HEAVENS toggle appears in the header only when HEAVENS threats were generated.

---

## Run Input

Use the following system description when creating the test run. It is automotive (triggers HEAVENS) and has enough complexity to produce threats across all STRIDE categories and multiple HEAVENS categories.

```
The ADAS (Advanced Driver Assistance System) Control Unit manages lane-keeping, adaptive cruise control, and automatic emergency braking for a passenger vehicle.

Hardware Components:
- ADAS ECU (main compute unit, ARM Cortex-A72, running Linux 5.15 with PREEMPT_RT patch)
- Front Radar Sensor (77GHz FMCW radar, connected via automotive Ethernet to ADAS ECU)
- Front Camera Module (8MP monocular camera, CSI-2 interface, runs proprietary vision firmware v3.1.0)
- Ultrasonic Sensor Array (8 sensors, I2C bus, proximity detection for parking assist)
- Brake Actuator Interface (CAN-connected, relays emergency braking commands to brake ECU)
- GPS/GNSS Receiver (u-blox M9N, connected via UART to ADAS ECU)
- V2X Communication Module (DSRC/C-V2X, 802.11p, communicates with infrastructure and other vehicles)
- Hardware Security Module (HSM, SPI-connected to ADAS ECU, stores signing keys and certificates)

Software:
- ADAS Control Application (version 4.2.1, runs on ADAS ECU)
- OpenSSL (version 1.1.1t, used for TLS on ADAS ECU)
- Linux Kernel (version 5.15, ADAS ECU)
- V2X Stack (version 2.0.3, runs on V2X Communication Module)

Communication Interfaces:
- Automotive Ethernet between ADAS ECU and Front Radar Sensor (sensor data, unidirectional)
- CSI-2 interface between Front Camera Module and ADAS ECU (video stream, unidirectional)
- CAN Bus between ADAS ECU and Brake Actuator Interface (safety-critical brake commands, bidirectional)
- DSRC/C-V2X wireless link between V2X Communication Module and external infrastructure (V2X messages, bidirectional)
- UART link between GPS/GNSS Receiver and ADAS ECU (positioning data, unidirectional)
- OTA Update channel between ADAS ECU and OEM Backend (firmware updates over TLS, bidirectional)
- Diagnostic interface (OBD-II port, CAN, bidirectional, connects external diagnostic tools to ADAS ECU)

Trust Boundaries:
- Vehicle Internal: contains ADAS ECU, Front Radar Sensor, Front Camera Module, Ultrasonic Sensor Array, Brake Actuator Interface, GPS/GNSS Receiver, Hardware Security Module
- Wireless Perimeter: V2X Communication Module sits at the boundary between Vehicle Internal and external
- External: OEM Backend (cloud), external diagnostic tools, external V2X infrastructure
- The DSRC/C-V2X link crosses from Vehicle Internal to External
- The OTA channel crosses from Vehicle Internal to External
- The OBD-II diagnostic port crosses from Vehicle Internal to External
```

---

## Expected Overall Output

After the pipeline completes the threats step, the Threat Generation page for this run should show:

**STRIDE threats (approx.):** 25–40 threats covering all 6 STRIDE categories — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege

**HEAVENS threats (approx.):** 4–10 threats covering automotive safety categories — Safety, Operational, Financial

**Toggle:** STRIDE/HEAVENS toggle should be visible in the header because HEAVENS threats are present

---

## Test Cases

### TC-01 — Page Loads and Table Renders

**What to check:** The page loads without errors. The threat table is populated with rows.

**How:** Navigate to `/threats?runId=<test-run-id>`. Wait for data to load.

**Pass:** Table renders with at least 20 rows. No loading spinner stuck. No console errors.

---

### TC-02 — Table Columns Are Correct

**What to check:** The table has exactly four columns — ID, Title, Category, Severity. There is no Confidence column.

**How:** Inspect the table header row.

**Pass:** Headers read "ID", "Title", "Category", "Severity" (plus the chevron column). No "Confidence" header present. No progress bar visible anywhere in the table rows.

---

### TC-03 — Severity Badges Are Present and Colored

**What to check:** Every row has a severity badge. The four possible values (low, medium, high, extreme) are visually distinct using color.

**How:** Scan the table. Check that:
- `extreme` badges are red
- `high` badges are orange
- `medium` badges are yellow
- `low` badges are green

**Pass:** All rows have a badge. At least 2 distinct severity levels are present across the table (a safety-critical ADAS system should not produce all-low threats). Colors match the spec above.

---

### TC-04 — STRIDE/HEAVENS Toggle Visible

**What to check:** The toggle appears in the page header because this run has HEAVENS threats.

**How:** Look for the segmented "STRIDE / HEAVENS" toggle button in the top-right area of the page header.

**Pass:** Toggle is visible. Default active state is STRIDE. The table shows STRIDE threats by default.

---

### TC-05 — Toggle Switches Framework Correctly

**What to check:** Clicking HEAVENS switches the table to show only HEAVENS threats, and clicking STRIDE switches back.

**How:**
1. Note the threat count shown in the subtitle (e.g. "32 STRIDE threats")
2. Click HEAVENS — table should refresh with a smaller set of threats
3. Confirm all visible threats have automotive-safety categories (Safety, Operational, Financial, etc.)
4. Click STRIDE — table returns to the full STRIDE threat list

**Pass:** Table contents change on toggle. HEAVENS table only shows HEAVENS-framework threats. STRIDE table only shows STRIDE-framework threats. Subtitle count updates to match. Open drawer closes when switching frameworks.

---

### TC-06 — Toggle Hidden on Non-HEAVENS Run

**What to check:** If a run has no HEAVENS threats (non-automotive system), the toggle does not appear.

**How:** Run the pipeline on a non-automotive system description (e.g. a web application or cloud service). Navigate to its Threat Generation page.

**Pass:** No STRIDE/HEAVENS toggle visible. Page shows only the table with no framework selector.

---

### TC-07 — STRIDE Category Ordering (S→T→R→I→D→E)

**What to check:** STRIDE threats are grouped by category in the order Spoofing → Tampering → Repudiation → Information Disclosure → Denial of Service → Elevation of Privilege. Within each group, threats are ordered by confidence descending.

**How:** Scroll through the STRIDE table. Verify the category groupings appear in the correct order — all Spoofing threats first, then all Tampering threats, etc. Within a group, the first row should have a higher or equal confidence than the last row (confidence is not shown but can be verified in the DB or the drawer is not needed for this check — just confirm the category blocks are in the right sequence).

**Pass:** Category blocks follow S→T→R→I→D→E order. No Tampering threat appears before a Spoofing threat, etc. Groups do not interleave.

---

### TC-08 — HEAVENS Category Ordering (H→E→A→V→N→S)

**What to check:** HEAVENS threats are grouped by the first letter of their category following the HEAVENS acronym order.

**How:** Switch to HEAVENS view. Observe the category ordering. Categories starting with S (Safety) should appear last (S is the 7th letter of HEAVENS). Categories starting with earlier letters appear first.

**Pass:** Category groups follow the HEAVENS acronym letter order. Safety threats appear at the end of the HEAVENS table.

---

### TC-09 — Row Click Opens Drawer

**What to check:** Clicking any row opens the detail drawer on the right side. The drawer slides in from the right.

**How:** Click any row in the table.

**Pass:** Drawer appears on the right side. Table shifts left (content area shrinks). Drawer has a visible slide-in animation. The clicked row is highlighted with a left-border accent.

---

### TC-10 — Drawer Shows Correct Threat Details

**What to check:** The drawer shows the correct content for the selected threat.

**How:** Click a row. In the drawer verify:
- Header shows the short ID (first 8 chars) and a severity badge
- "Title" section matches the row title
- "Description" section has non-empty text
- "Category" and "Framework" are shown in a 2-column grid

**Pass:** All sections present and non-empty. Framework reads "STRIDE" or "HEAVENS". Severity badge in header matches the badge in the table row. No "Confidence" field visible anywhere in the drawer.

---

### TC-11 — Impact Breakdown Section in Drawer

**What to check:** The drawer shows an Impact Breakdown section with three rows: Safety, Financial, Operational.

**How:** Open any threat drawer. Scroll to "Impact Breakdown". Verify:
- Three labeled rows are present: Safety, Financial, Operational
- Each row has a value (e.g. "catastrophic", "significant", "loss of function")
- Values use spaces instead of underscores (e.g. "loss of function" not "loss_of_function")

**Pass:** All three rows present. Values are human-readable. At least one threat has a value other than "negligible" across all three rows — a safety-critical system should have meaningful impact values.

---

### TC-12 — Impacted Assets Populated

**What to check:** The Impacted Assets section in the drawer shows actual asset names, not "None listed."

**How:** Open several threat drawers. Check the "Impacted Assets" section.

**Pass:** At least 80% of threats have at least one impacted asset listed. Each asset shows name and kind (e.g. "ADAS ECU · ECU"). The section does not universally show "None listed."

---

### TC-13 — Entry Points Populated

**What to check:** The Entry Points section in the drawer shows actual assets, not "None listed."

**How:** Open several threat drawers. Check the "Entry Points" section.

**Pass:** At least 80% of threats have at least one entry point listed. Entry point assets make sense in context (e.g. a threat about V2X spoofing should have the V2X Communication Module as an entry point).

---

### TC-14 — Drawer Closes on X Button

**What to check:** Clicking the X button in the drawer header closes the drawer. The table returns to full width.

**How:** Open a drawer, then click the X.

**Pass:** Drawer closes. Table expands back to full width. No selected row highlight remains.

---

### TC-15 — No Run State

**What to check:** Navigating to the page without a `runId` shows the empty state, not a broken table.

**How:** Navigate to `/threats` with no `?runId=` parameter.

**Pass:** Empty state UI shown ("No threats generated yet" with a link to Model Explorer). No errors. No table or drawer rendered.

---

## Known Acceptable Limitations for This Iteration

- Entry points and impacted assets will be empty ("None listed") for runs created **before** this iteration's backend fix was deployed — this is expected and not a bug for old runs
- The HEAVENS toggle only appears when HEAVENS threats exist; runs on non-automotive systems will never show the toggle — this is by design
- Impact breakdown values on old runs may show in raw form (e.g. "Critical" with capital C, or free-text HEAVENS strings) — normalization only applies to new runs going forward
- Confidence is intentionally not displayed anywhere on this page — do not flag its absence as a missing feature
