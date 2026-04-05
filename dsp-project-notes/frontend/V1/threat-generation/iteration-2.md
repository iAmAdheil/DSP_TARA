# Threat Generation — Frontend Iteration 2

## Context

Iteration 1 is in place. Five frontend issues were identified in QA. F-03 and F-04 are quick fixes. F-01 and F-06 are UX improvements. F-05 is dependent on a backend fix landing first.

Reference: `QA/V1/threat-generation/qa-findings-iteration-1.md`

---

## Dependency Note

**F-05 (category badge overflow) depends on backend iteration 2 landing first.** The overflow is caused by verbose LLM-generated category names (e.g. "Safety impact on vehicle occupants and road users"). Once the backend constrains HEAVENS categories to short enum tokens ("Safety", "Operational", etc.), this issue will resolve without any frontend changes. Do not add truncation or wrapping hacks to the frontend — wait for the data to be clean.

---

## Changes Required

All changes are in `src/pages/ThreatGeneration.tsx`.

---

### 1. Replace Short ID with Sequential Index (F-01)

**Problem:** The ID column shows the first 8 characters of the threat CUID. Because many threats are created in rapid succession, they share the same 8-char prefix — in QA, all 6 HEAVENS threats showed `cmnk6ibt` and only 5 unique short IDs existed across 33 STRIDE threats. The column is visually useless for distinguishing rows.

**Fix:** Replace the short ID display with a sequential 1-based index scoped to the current visible list. Format as `T-001`, `T-002`, etc. The full ID should still be accessible via the drawer header (keep the existing 8-char display there since it's contextual, not a list key).

In the table `tbody`, use the array index from `.map()`:

```tsx
{visibleThreats.map((threat, index) => (
  <tr key={threat.id} ...>
    <td ...>T-{String(index + 1).padStart(3, '0')}</td>
    ...
  </tr>
))}
```

The index resets when switching between STRIDE and HEAVENS views — this is correct behaviour (T-001 in STRIDE view and T-001 in HEAVENS view are different threats).

---

### 2. Remove CSS capitalize from Impact Breakdown Values (F-03)

**Problem:** Impact breakdown values in the drawer display in Title Case ("Catastrophic", "Complete Loss") due to `text-transform: capitalize` being applied via the `capitalize` Tailwind utility class on the value element. The spec requires lowercase display ("catastrophic", "complete loss"). The DOM text is correctly lowercase — it is a CSS presentation bug only.

**Fix:** In the `ImpactRow` component, the value element currently has `capitalize` in its className. Remove it:

```tsx
// Before
<span className="text-[12px] font-semibold text-text-primary capitalize">
  {value.replace(/_/g, ' ')}
</span>

// After
<span className="text-[12px] font-semibold text-text-primary">
  {value.replace(/_/g, ' ')}
</span>
```

---

### 3. Normalize Framework Display to Uppercase (F-04)

**Problem:** The Framework field in the drawer displays the raw DB value — `"stride"` and `"heavens"` (lowercase). STRIDE threats happen to render as "STRIDE" because the existing code does `.toUpperCase()` somewhere, but HEAVENS threats render as "heavens" (lowercase). This inconsistency was observed in QA (TC-10).

**Investigation first:** Locate the exact line in the drawer where `selectedThreat.framework` is rendered. The current code in the drawer footer reads:

```tsx
<p className="text-[12px] text-text-muted text-center">Framework: {selectedThreat.framework}</p>
```

This was moved to the grid section in iteration 1. Find the current render location and confirm whether `.toUpperCase()` is already applied to the STRIDE path but not HEAVENS, or whether it's missing entirely.

**Fix:** Wherever `selectedThreat.framework` is rendered in the drawer, apply `.toUpperCase()`:

```tsx
<p className="text-[13px] text-text-primary uppercase">{selectedThreat.framework}</p>
```

The `uppercase` Tailwind class applies `text-transform: uppercase` — this handles both `"stride"` → `"STRIDE"` and `"heavens"` → `"HEAVENS"` without needing a conditional.

Note: The current drawer grid already has `uppercase` on the framework value per the iteration 1 implementation. Confirm via browser that it is rendering correctly for both frameworks — if HEAVENS is still showing lowercase, there may be a second render location.

---

### 4. Fix Header Layout When Drawer is Open (F-06)

**Problem:** When the detail drawer is open, the main content area shrinks (via `pr-[380px]`). The page header inside the content area also shrinks, causing the "Threat Generation" title to wrap to two lines and the controls (toggle + buttons) to reflow to a second line. The header becomes cluttered and hard to read.

**Fix:** Two changes to the header:

**A. Prevent title from wrapping:**

```tsx
<h2 className="text-[20px] font-bold text-text-primary mb-[4px] tracking-tight whitespace-nowrap">
  Threat Generation
</h2>
```

**B. Make the controls row wrap gracefully instead of fighting for space:**

Change the header flex container to allow wrapping, and give the controls group a `shrink-0` so they don't compress:

```tsx
// Outer header — allow wrap
<header className="mb-[24px] flex items-start justify-between gap-[16px] flex-wrap">

// Controls group — prevent shrinking
<div className="flex items-center gap-[12px] shrink-0">
  {/* toggle + buttons */}
</div>
```

This way, on narrow layouts (drawer open), the controls drop to a second line cleanly rather than compressing into each other. The title stays on one line regardless.

---

## What NOT to Change

- `useThreats.ts` — no changes needed
- Toggle visibility logic — correct as-is; F-06 only
- Sort logic — correct as-is
- Drawer open/close behaviour — correct as-is
- Severity badge colors — correct as-is
- `src/types.ts` and `src/generated/api.ts` — no type changes needed for this iteration

---

## Deferred to Later Iteration

- **F-02** (sidebar project context desynchronizes on URL navigation) — this is a cross-feature sidebar concern affecting multiple pages, not scoped to Threat Generation; tracked separately
- **F-05** (HEAVENS category badge overflow) — blocked on backend iteration 2; no frontend change needed once backend ships clean category names
- **F-07** (medium/low severity badge colors untestable with ADAS input) — not a bug; QA instructions should be updated to include a second low-risk system input for badge color coverage
