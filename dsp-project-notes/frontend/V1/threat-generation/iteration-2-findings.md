# Threat Generation — Iteration 2 Findings

## Status: Complete ✓

---

## Changes Applied

### F-01 — Sequential Index in Table (done)
Replaced `{threat.id.slice(0, 8)}` with `T-{String(index + 1).padStart(3, '0')}` using the `.map()` index. The `title` attribute (which was showing the truncated ID) was also removed since the index label needs no tooltip. Full ID remains visible in the drawer header. Index resets per framework view — correct per spec.

### F-03 — Remove `capitalize` from Impact Breakdown Values (done)
Removed the `capitalize` Tailwind utility from the `ImpactRow` value span. Impact values now render fully lowercase as specified (e.g. "catastrophic", "complete loss").

### F-04 — Framework Uppercase Display (confirmed, no change needed)
The framework value in the drawer grid already has `uppercase` class at line 229: `<p className="text-[13px] text-text-primary uppercase">`. This correctly transforms both `"stride"` → `"STRIDE"` and `"heavens"` → `"HEAVENS"` via CSS. No code change required.

### F-06 — Header Layout When Drawer Open (done)
Two changes to the header:
- `<header>` flex container: added `items-start`, `gap-[16px]`, `flex-wrap` (replaced `items-center justify-between`)
- `<h2>`: added `whitespace-nowrap` to prevent title wrapping
- Controls `<div>`: added `shrink-0` to prevent control group compression

Controls now drop to a second row on narrow layouts (drawer open) instead of compressing.

---

## Deferred (per spec)

- **F-02** — sidebar project context desync: cross-feature concern, tracked separately
- **F-05** — HEAVENS category badge overflow: blocked on backend iteration 2; no frontend change
- **F-07** — medium/low badge color coverage gap: QA instruction issue, not a code bug

---

## TypeScript
`npx tsc --noEmit` — no errors.
