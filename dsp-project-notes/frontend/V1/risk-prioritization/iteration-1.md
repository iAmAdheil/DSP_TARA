# Risk Prioritization — Frontend Changes (Iteration 1)

## Goal

Fix the broken Risk Prioritization page. The page's purpose is correct — a consolidated view of all risk items across source types, bucketed by severity — but the current implementation has layout bugs and missing content. This iteration makes it functional and scannable.

All changes are in `src/pages/RiskPrioritization.tsx`. No new hooks, no new routes, no backend changes.

---

## Context: what data is available

Each `RiskItem` from the API already carries a resolved `sourceType` (`"threat"`, `"cve"`, `"attack_path"`) and a populated nested object for that source:

- **Threat items** — `risk.threat` is populated, containing `title`, `category`, `description`, `confidence`
- **CVE items** — `risk.cveMatch` is populated, containing `cveIdentifier`, `cvssScore`, `matchTier`, `whyRelevant`
- **Attack path items** — `risk.attackPath` is populated, containing `startAsset` (resolved asset object with `name`), `targetAsset` (resolved asset object with `name`), `feasibilityScore`, `trustBoundaryCrossings`

The `factorBreakdown` field contains `factors[]` (likelihood, impact, exploitability, exposureModifier) and the `formula` string.

---

## Problems to fix

### 1 — Vertical scroll is broken

The current column cards render inside `overflow-y-auto` divs, but the height constraints on the flex parent chain don't give them a real bounded height to scroll within. Cards overflow silently.

**Fix:** Replace the column-based layout entirely with horizontal rows (see Layout section below). Each row uses `overflow-x-auto` on a `flex-row` container — this is inherently simpler and avoids the height chaining issue.

### 2 — Cards have inconsistent height

Cards currently grow to fit their content. When card content varies (a CVE identifier is one short line; a threat title may wrap to two), cards in the same row become different heights. This looks broken on a scan.

**Fix:** Give every card a fixed height (`h-[160px]`) and a fixed width (`w-[240px] shrink-0`). All text that may overflow uses `line-clamp-2` or `truncate` as appropriate — never wraps beyond its allocated lines.

### 3 — Wrong title field used for threat cards

`getRiskTitle` currently reads `risk.threat?.description.slice(0, 60)` — the long description field — instead of the dedicated `title` field. Threat items have a `title` field (e.g., `"Malicious CAN Message Injection via OBD-II"`) that is short, specific, and meant for display.

**Fix:** Use `risk.threat?.title` as the primary. Fall back to `risk.threat?.description.slice(0, 60)` only if `title` is null/empty.

### 4 — Attack path cards show raw ID

`getRiskTitle` falls back to `risk.id.slice(0, 8)` when `risk.attackPath?.startSurface` is undefined. `startSurface` is a raw asset ID (a cuid), so even when it resolves, it produces gibberish. The API returns `risk.attackPath.startAsset` and `risk.attackPath.targetAsset` — resolved objects with a `name` field — which should be used instead.

**Fix:** For attack path items, display `"[startAsset.name] → [targetAsset.name]"`. If either is unavailable, fall back to `"Attack Path"` as a last resort.

### 5 — No source type filter

With hundreds of CVE-based risk items mixed into the same row as a handful of threat items, the row becomes unreadable. Users need to be able to focus by type.

**Fix:** Add a per-row filter toggle with four options: **All · Threats · CVEs · Paths**. Each severity row maintains its own independent filter state.

---

## Layout

**Current:** 4 columns side by side, each column a vertical scrolling list.

**New:** 4 rows stacked vertically, each row a horizontal scrolling strip of fixed-size cards.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Risk Prioritization Queue                          [Recompute] [→ Mitigation] │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ● CRITICAL  (0)            [All] [Threats] [CVEs] [Paths]                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  ← horizontal scroll →                                                   │  │
│  │  (empty dashed placeholder)                                              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ● HIGH  (28)               [All] [Threats] [CVEs] [Paths]                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  [card] [card] [card] [card] [card] [card] [card] → scroll →             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ● MEDIUM  (4)              [All] [Threats] [CVEs] [Paths]                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  [card] [card] [card] [card]                                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ● LOW  (0)                 [All] [Threats] [CVEs] [Paths]                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  (empty dashed placeholder)                                              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

The overall page layout is a `flex flex-col` with `gap-[24px]` between rows. No fixed `h-[calc(...)]` on the outer container — let it grow naturally with page scroll.

Each **severity row** is a two-part block:
- **Row header:** severity label (with a color dot), total count, and filter toggle pills
- **Scroll strip:** `flex flex-row gap-[12px] overflow-x-auto pb-[8px]` container holding the fixed-size cards

---

## Row header

```
● CRITICAL  (0)    [All] [Threats] [CVEs] [Paths]
```

- Colored dot (same color as card top border — see card colors below)
- Label in `text-[13px] font-bold text-text-secondary uppercase`
- Count in a small rounded badge `text-[11px] font-bold text-text-muted`
- Filter pills aligned to the right: `text-[11px] font-semibold` pills, active pill has colored background, inactive is ghost

Filter pill states — use the row's severity accent color for the active pill background:

| Severity | Dot / active pill color |
|----------|------------------------|
| Critical | `#b42318` |
| High     | `#d14343` |
| Medium   | `#c27a10` |
| Low      | `#2f855a` |

The count shown in the badge reflects the **filtered** count (e.g., "28" drops to "4" when "Threats" is selected and only 4 threat items are in the high bucket).

---

## Card anatomy

Every card is `w-[240px] shrink-0 h-[160px]` with a `rounded-[8px]` border and colored top border (`border-t-4`). Content inside uses `flex flex-col` with `justify-between` so the bottom meta row is always pinned to the bottom of the card.

### Card sections (top to bottom)

**Top area (grows to fill):**
- Source type badge (pill): `"Threat"`, `"CVE"`, or `"Attack Path"` — `text-[10px] font-bold uppercase` in a muted pill
- Title: `text-[13px] font-semibold text-text-primary line-clamp-2 leading-snug` — always exactly 2 lines max, truncated with `...`
- Source-specific secondary line (see per-type details below): `text-[11px] text-text-muted truncate`

**Bottom row (pinned):**
- Left: score label `text-[10px] uppercase text-text-muted` + score value `text-[14px] font-bold text-text-primary`
- Right: likelihood label + value in `text-[11px] text-text-muted`

```
┌────────────────────────────────┐  ← border-t-4 accent color
│ [Threat]                       │  ← source badge
│                                │
│ Malicious CAN Message          │  ← title, line-clamp-2
│ Injection via OBD-II           │
│ Tampering · 0.90 confidence    │  ← secondary line (type-specific)
│                                │
│ Score                Likelihood│
│ 0.76                      0.90 │  ← bottom meta row
└────────────────────────────────┘
```

---

## Per-type card content

### Threat cards

- **Title:** `risk.threat.title`. If null/empty, fall back to `risk.threat.description.slice(0, 60)`.
- **Secondary line:** `[category] · [confidence] confidence` — e.g., `"Tampering · 0.90 confidence"`
- **Bottom left:** Final score
- **Bottom right:** Likelihood

### CVE cards

- **Title:** `risk.cveMatch.cveIdentifier` — always short (e.g., `"CVE-2023-32233"`). No truncation needed; use `truncate` as a safety measure.
- **Secondary line:** `CVSS [cvssScore ?? "–"] · [matchTier]` — e.g., `"CVSS 9.8 · exact"`. Format cvssScore to one decimal place.
- **Bottom left:** Final score
- **Bottom right:** Exploitability

### Attack path cards

- **Title:** `[startAsset.name] → [targetAsset.name]` — e.g., `"Telematics Control Unit → Main Brake ECU"`. Use `line-clamp-2`.
- **Secondary line:** `[trustBoundaryCrossings] boundary crossing(s)` if > 0, otherwise `"No boundary crossings"`.
- **Bottom left:** Final score
- **Bottom right:** Feasibility (from `risk.attackPath.feasibilityScore`)

---

## Filter logic

Each severity row manages its own `filterType` state, defaulting to `"all"`. Type is one of: `"all" | "threat" | "cve" | "attack_path"`.

Filtering is a client-side `Array.filter()` on the items already bucketed into that severity. The count badge reflects the filtered result, not the total.

When the "Paths" pill is active and the run has no attack path risk items in that bucket, show the empty placeholder (see below).

---

## Empty placeholder

When a severity row has no items (after applying the filter), render a single placeholder card inside the scroll strip:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│    (dashed border, border-2 border-dashed            │
│     border-border-default, rounded-[8px],            │
│     h-[160px], min-w-[200px])                        │
│                                                      │
│         Queue Empty                                  │
│    (text-[12px] font-medium text-text-disabled       │
│     uppercase, centered)                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## State management

Add a `filterType` state per severity row. The cleanest approach is a single state object at the component level:

```ts
const [filters, setFilters] = useState<Record<string, 'all' | 'threat' | 'cve' | 'attack_path'>>({
  critical: 'all',
  high:     'all',
  medium:   'all',
  low:      'all',
});
```

The `queues` array maps over severity buckets and reads `filters[severity]` to compute the visible items.

---

## Helper function update: `getRiskTitle`

Replace the existing `getRiskTitle` function with the corrected version:

| Source type | Primary | Fallback |
|-------------|---------|----------|
| `threat` | `risk.threat?.title` | `risk.threat?.description.slice(0, 60)` → `risk.id.slice(0, 8)` |
| `cve` | `risk.cveMatch?.cveIdentifier` | `risk.id.slice(0, 8)` |
| `attack_path` | `` `${risk.attackPath?.startAsset?.name} → ${risk.attackPath?.targetAsset?.name}` `` | `"Attack Path"` |

Only build the attack path string if both `startAsset?.name` and `targetAsset?.name` are present. If either is missing, use the fallback.

---

## Files changed

| File | Change |
|------|--------|
| `src/pages/RiskPrioritization.tsx` | Full layout overhaul: replace 4-column kanban with 4 horizontal scroll rows; add per-row filter toggle; fix card titles; fix attack path display; enforce fixed card height; update `getRiskTitle` |

No hook, type, API, or backend changes required.
