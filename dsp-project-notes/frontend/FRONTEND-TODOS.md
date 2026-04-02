# Frontend TODOs

> Frontend work items identified during backend design discussions. These are things the frontend needs to implement to support backend decisions.
>
> **What belongs here:**
> - UI features required by backend design decisions
> - Frontend behavior specified during backend/product discussions
> - Display requirements for backend data
>
> **What does NOT belong here:**
> - Backend implementation details (those go in `backend/Iteration-1-Decisions.md`)
> - Assumptions (those go in `ASSUMPTIONS.md`)
> - Deferred backend features (those go in `DEFERRED-TODOS.md`)

---

## Risk Scoring — Display Formula on Frontend

**Context:** The risk scoring step uses a fixed 4-factor weighted formula. The user cannot customize weights yet, but should be able to see exactly how scores are computed for transparency.

**What to display:**
- Show the formula: `finalScore = 0.3 × likelihood + 0.3 × impact + 0.25 × exploitability + 0.15 × exposureModifier`
- Show severity bucket thresholds: critical (0.8–1.0), high (0.6–0.79), medium (0.4–0.59), low (0.0–0.39)
- On each RiskItem, show the per-factor breakdown (value, weight, contribution, source label) — this data is returned in the `breakdown` JSON field on each RiskItem

**Where:** Risk register view, probably as an info tooltip or collapsible section.

---

## Risk Register — Show Source Type per RiskItem

**Context:** Each RiskItem has a `sourceType` field: `"threat"`, `"cve"`, or `"attack_path"`. The user needs to know what kind of item they're looking at in the ranked list.

**What to display:**
- Visual indicator (icon, badge, or tag) per RiskItem showing its source type
- Clicking/expanding a RiskItem should link to the underlying source (the threat detail, CVE detail, or attack path detail)

---

## Threat Generation — HEAVENS Framework Toggle

**Context:** STRIDE threats are always generated. HEAVENS threats are only generated when the LLM detects automotive scope. The backend stores a `framework` field on each Threat (`"stride"` or `"heavens"`).

**What to display:**
- If HEAVENS threats exist for a run: show a toggle/tab to switch between STRIDE and HEAVENS views
- If no HEAVENS threats exist: hide the toggle entirely
