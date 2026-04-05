# Threat Generation — Frontend Changes (Iteration 1)

## Aim

Overhaul the Threat Generation page to match the client's product vision: severity-driven table, STRIDE/HEAVENS toggle, structured category ordering, and a richer detail drawer with impact breakdown.

---

## Changes (all in `src/pages/ThreatGeneration.tsx`)

### Table Columns

**Before:** ID · Title · Category · Confidence (bar + %)
**After:** ID · Title · Category · Severity

Confidence removed from the table entirely. Severity is a coloured badge with 4 levels:

| Level   | Style |
|---------|-------|
| extreme | Red (danger-bg / danger-fg) |
| high    | Orange (warning-bg / warning-fg) |
| medium  | Yellow (#fef9c3 / #854d0e) |
| low     | Green (success-bg / success-fg) |

### STRIDE / HEAVENS Toggle

A segmented toggle button sits in the page header. It is **only rendered when `heavensThreats.length > 0`** — so on non-automotive runs (STRIDE only), the header stays clean.

Switching the toggle filters the table to the selected framework and clears the open drawer.

### Category Ordering

Threats are grouped by the first letter of their category, with groups ordered by the framework acronym:

- **STRIDE:** S → T → R → I → D → E
- **HEAVENS:** H → E → A → V → N → S

Within each group, threats are sorted by confidence descending (highest confidence first).

Implementation: `sortThreats(threats, framework)` uses `STRIDE_CATEGORY_ORDER` / `HEAVENS_CATEGORY_ORDER` lookup maps; unknown category letters fall to the end (order 99).

### Detail Drawer

**Removed:** Confidence field (was shown as a raw decimal — not useful to non-technical readers)

**Changed:**
- Header now shows the severity badge inline next to the ID
- Category and Framework shown in a 2-column grid
- Impacted Assets and Entry Points now show both asset name and kind (e.g. "Main Brake ECU · ECU")

**Added — Impact Breakdown section:**

```
Safety:      catastrophic
Financial:   significant
Operational: loss_of_function
```

Rendered as a bordered card with one row per dimension. Underscores replaced with spaces for readability (`loss_of_function` → `loss of function`). Section only renders when `impactBreakdown` is present.

---

## Type Changes

After adding `severity` to `openapi.yaml` and running `npm run api:types`, the generated `Threat` type now includes:

```ts
severity: "low" | "medium" | "high" | "extreme";
```

No manual changes to `src/generated/api.ts` or `src/types.ts` — generated automatically.
