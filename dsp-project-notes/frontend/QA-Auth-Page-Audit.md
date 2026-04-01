# Auth Page — QA Audit (Run 2)
**Date:** 2026-03-31
**Role:** Senior Designer × QA Engineer
**Spec ref:** `TARA-Theme-System-Spec.md`
**Source:** `dsp-frontend/src/pages/AuthPage.tsx`
**Server:** `http://localhost:5173/auth`
**Screenshots:** `dsp-project-notes/frontend/qa/`

---

## What's now correct

The previous audit's critical layout and color token issues have all been resolved in this revision.

| Fixed | Evidence |
|---|---|
| Tabs stack vertically | `s01-signin-default.png` |
| Brand `h1` is dark (`#1f2937`) | Computed: `rgb(31, 41, 55)` |
| Form labels visible (`#4b5563`) | Computed: `rgb(75, 85, 99)` |
| Card border present (1 px `--border-subtle`) | Computed: `borderWidth: 1px` |
| Card radius 12 px | Computed: `borderRadius: 12px` |
| Input height 36 px, font-size 13 px | Computed: `height: 36px, fontSize: 13px` |
| Duplicate checkbox node removed | Computed: `checkboxCount: 1` |
| Subtitle muted correctly (`#6b7280`) | Computed: `rgb(107, 114, 128)` |

---

## Open issues

### 1 — Checkbox collapses to 4 × 4 px (root cause now identified)

**Screenshot:** `s06-checkbox-checked.png`

![Checkbox checked state](qa/s06-checkbox-checked.png)

The checkbox renders as a barely-visible dot to the left of "Keep me signed in for 30 days". It is not an interactive checkbox shape; it is 4 × 4 px.

**Computed styles:**
```
checkbox.width:  4px
checkbox.height: 4px
checkbox.borderRadius: 4px  ← fully circular at this size
```

**Root cause — `index.css` spacing scale collision:**

In `index.css`, the `@theme inline` block registers the TARA design tokens as Tailwind spacing values:

```css
/* index.css — @theme inline */
--spacing-4: var(--space-4);   /* = 4px  */
--spacing-6: var(--space-6);   /* = 6px  */
--spacing-8: var(--space-8);   /* = 8px  */
--spacing-16: var(--space-16); /* = 16px */
```

In Tailwind v4, any `--spacing-N` key defined in `@theme` **replaces** the default calculated value for that step. So:

| Tailwind class | Default Tailwind v4 | This project |
|---|---|---|
| `w-4` / `h-4` / `size-4` | 1rem = **16 px** | `var(--spacing-4)` = **4 px** |
| `w-6` / `h-6` / `p-6` | 1.5rem = **24 px** | `var(--spacing-6)` = **6 px** |
| `space-y-4` | 1rem = **16 px** | **4 px** |

The checkbox component (`components/ui/checkbox.tsx`) uses `size-4` in its base class and the `h-4 w-4` added via `className` in `AuthPage.tsx` both resolve to **4 px**, not 16 px. They agree on the wrong value.

**This same collision affects any other component in the project that uses Tailwind spacing utilities** — gaps, paddings, margins, icon sizes.

**Fix — two-step:**

**Step A** — Remove `--spacing-N` entries from `index.css @theme inline`. The TARA tokens should stay as CSS custom properties used directly in component classes (`var(--space-4)`), not as Tailwind scale overrides.

```css
/* index.css — REMOVE this entire block from @theme inline */
--spacing-2: var(--space-2);
--spacing-4: var(--space-4);
/* ...all --spacing-N lines */
```

**Step B** — Fix the checkbox size using an explicit pixel value that is immune to this override:

```tsx
/* AuthPage.tsx line 102 — BEFORE */
<Checkbox id="remember" className="h-4 w-4 shrink-0 rounded-[4px] ..." />

/* AFTER */
<Checkbox id="remember" className="h-[16px] w-[16px] shrink-0 rounded-[4px] ..." />
```

Also update `checkbox.tsx` line 13 — the component base class uses `size-4` which resolves to 4 px:

```tsx
/* checkbox.tsx line 13 — BEFORE */
"peer relative flex size-4 shrink-0 ..."

/* AFTER */
"peer relative flex h-[16px] w-[16px] shrink-0 ..."
```

---

### 2 — Loading / disabled button renders wrong color

**Screenshot:** `s12-loading-signin.png`

![Loading state](qa/s12-loading-signin.png)

When `isLoading` is true, the submit button renders as a washed-out **sage green** (muted `#24a06b`) instead of the spec disabled gray `#d1d5db`.

**Why it happens:** The button element receives `disabled` attribute, which triggers browser/Tailwind's default `disabled:opacity-50` reduction on the `bg-primary` green. The `.btn-primary` utility class in `index.css` correctly defines `disabled:bg-[#d1d5db]`, but the submit button uses **inline Tailwind utilities**, not `.btn-primary`. So the gray override never applies.

**Spec §4.6 disabled state:** `bg: #d1d5db, border: #d1d5db, text: white, pointer-events: none`

**Fix — `AuthPage.tsx` lines 110–112:**

```tsx
/* BEFORE */
className="w-full h-[40px] bg-primary hover:bg-accent-600 text-white font-semibold text-[14px]
  rounded-[10px] shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-accent-500/20"

/* AFTER — add disabled state explicitly */
className="w-full h-[40px] bg-primary hover:bg-accent-600 active:bg-accent-700 text-white
  font-semibold text-[14px] rounded-[10px] shadow-sm transition-all
  focus-visible:ring-[3px] focus-visible:ring-accent-500/20
  disabled:bg-[#d1d5db] disabled:border-[#d1d5db] disabled:pointer-events-none"
```

Apply the same fix to the Register tab's "Create Account" button (`AuthPage.tsx` line ~177).

---

### 3 — Tab triggers have no hover state

**Screenshot:** `s14-tab-hover.png` (Create Account tab hovered, Sign In is active)

![Tab hover](qa/s14-tab-hover.png)

The inactive "Create Account" tab shows **zero visual change** on hover. There is no background tint, no text darkening, no cursor feedback. The only transition defined on `<TabsTrigger>` is `transition-all`, but no `hover:` variant classes are present.

**Spec §4.4 Tab behavior:** Inactive tabs should show a hover state (typically `hover:bg-surface-2` or a subtle background tint) so users know the element is interactive.

**Fix — `AuthPage.tsx` lines 42–54:** Add a `hover:` utility to both `<TabsTrigger>` elements:

```tsx
/* BEFORE (line 44) */
className="rounded-[8px] text-[13px] font-medium
  data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-xs
  text-text-secondary transition-all"

/* AFTER */
className="rounded-[8px] text-[13px] font-medium
  data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-xs
  text-text-secondary hover:text-text-primary hover:bg-white/60
  transition-all"
```

Apply the same to the second `<TabsTrigger>` (line 50).

---

### 4 — Primary button hover visually indistinguishable from default

**Screenshots:** `s01-signin-default.png` (default) vs `s02-signin-btn-hover.png` (hover)

| Default | Hover |
|---|---|
| ![Default](qa/s01-signin-default.png) | ![Button hover](qa/s02-signin-btn-hover.png) |

The `hover:bg-accent-600` class is correctly present in the code. The issue is that the visual delta between `--accent-500` (#24a06b) and `--accent-600` (#1b7f55) is too small — roughly 10% lightness difference — which is nearly imperceptible at typical screen brightness, especially against a white background.

**Suggestions (pick one):**
- Darken the hover value: use `hover:bg-accent-700` (`#166445`) for a clearer shift
- Add a subtle lift: `hover:-translate-y-px hover:shadow-md` (already defined in `.btn-primary` utility)

```tsx
/* AuthPage.tsx line 111 */
/* BEFORE */
className="... hover:bg-accent-600 ..."

/* AFTER */
className="... hover:bg-accent-600 hover:-translate-y-px hover:shadow-sm ..."
```

---

### 5 — Input focus ring is present but very thin

**Screenshots:** `s03-email-focus.png`, `s04-password-focus.png`

| Email focused | Password focused |
|---|---|
| ![Email focus](qa/s03-email-focus.png) | ![Password focus](qa/s04-password-focus.png) |

The focus state shows a **1 px green border** (`--border-focus` = #24a06b) but the `ring-[3px]` halo is not visible. The code uses `focus:ring-[3px] focus:ring-accent-500/15` — a 15% opacity ring at 3 px.

`accent-500/15` at 15% opacity on a white background (#24a06b at 0.15 alpha) produces a near-invisible mint halo that provides no practical focus cue.

**Spec §4.5 focus state:** `border: 1px solid --border-focus` + `box-shadow: 0 0 0 3px rgba(36, 160, 107, 0.15)`. The spec calls this out explicitly, meaning the halo should be visually distinguishable.

**Fix — `AuthPage.tsx` lines 76, 92:**

Increase the opacity to 20–25% so the ring is perceptible:

```tsx
/* BEFORE */
className="... focus:ring-[3px] focus:ring-accent-500/15 ..."

/* AFTER */
className="... focus:ring-[3px] focus:ring-accent-500/25 ..."
```

---

### 6 — Register tab: Password hint text renders at 14 px instead of 13 px

**Screenshot:** `s08-register-default.png`

![Register tab default](qa/s08-register-default.png)

The password hint "Must be at least 12 characters and contain special symbols." should render at 11 px (as coded: `text-[11px]`) but the `<span>` inside the checkbox label renders at 14 px in the computed audit (see `labelSpan.fontSize: 14px`).

Looking at `AuthPage.tsx` line 103:
```tsx
<span className="text-[13px] font-medium text-text-secondary leading-none">
```

The `text-[13px]` is an arbitrary value (should be immune to the spacing scale issue) but is computing as 14 px. Likely cause: the **shadcn `Input` component** (`components/ui/input.tsx`) applies a base `text-sm` class (= 14 px Tailwind default) which propagates to surrounding elements through CSS inheritance in this layout context.

Check `components/ui/input.tsx` for a `text-sm` default class and either remove it or use `text-[13px]` there too.

---

### 7 — Inactive tab background colour leaks `--bg-app` instead of being transparent

Computed style on the inactive `<TabsTrigger>`:
```
backgroundColor: rgb(246, 247, 248)  ← --bg-app (page background)
```

The tab list background is `--bg-surface-2` (`#f2f4f6`). The inactive trigger should be transparent so the surface-2 shows through, giving a visual pill for the active tab only. Instead the inactive trigger shows the **page background colour**, creating a subtle but noticeable mismatch where the inactive half of the tab list appears slightly different from the active half.

**Fix — `AuthPage.tsx` lines 42–54:** Ensure inactive tabs are `bg-transparent`:

```tsx
/* Add to both TabsTrigger className */
className="... bg-transparent data-[state=active]:bg-white ..."
```

The `bg-transparent` is needed because the base-ui or Radix `<TabsTrigger>` may default to `background: inherit` which picks up the page background from parent scroll context.

---

### 8 — SSO button section uses `border-subtle` without `border` width class

**AuthPage.tsx line 195:**
```tsx
<div className="px-6 py-4 bg-surface-1 border-t border-subtle flex flex-col items-center">
```

`border-t` correctly adds `border-top-width: 1px`. `border-subtle` sets the top border colour to `--border-subtle`. This is fine.

However, `bg-surface-1` combined with the spacing issue from finding #1: `py-4` resolves to `padding-y: 4px` (not 16px). This makes the SSO footer section very compressed vertically.

**Fix:** Use explicit values until the spacing scale is fixed:
```tsx
className="px-6 py-[16px] bg-surface-1 border-t border-border-subtle flex flex-col items-center"
```

Note also: `border-subtle` should be `border-border-subtle` to correctly resolve to `var(--color-border-subtle)` in Tailwind v4 naming.

---

## Full screenshot gallery

### Sign In — default
![s01 default](qa/s01-signin-default.png)

Colors, layout, and hierarchy all correct. Card border and radius render correctly.

---

### Sign In button — hover
![s02 button hover](qa/s02-signin-btn-hover.png)

Hover state present but imperceptible (Finding #4).

---

### Email input — focused
![s03 email focus](qa/s03-email-focus.png)

Green border on focus is present. Ring halo too faint (Finding #5).

---

### Password input — focused (email filled)
![s04 password focus](qa/s04-password-focus.png)

Password field focus correct. Lock icon visible at right. `admin@acmecorp.com` shows email value correctly coloured.

---

### "Forgot password?" — hover
![s05 forgot hover](qa/s05-forgot-hover.png)

Hover darkens from `--accent-600` to `--accent-700`. Correct. Subtle but present.

---

### Checkbox — clicked (checked state)
![s06 checkbox](qa/s06-checkbox-checked.png)

Checkbox renders as a tiny "·" dot — 4 × 4 px (Finding #1). Checked state cannot be perceived by the user.

---

### SSO button — hover
![s07 SSO hover](qa/s07-sso-hover.png)

Hover applies `bg-surface-2` background tint correctly. Border and icon render correctly.

---

### Register tab — default
![s08 register](qa/s08-register-default.png)

Labels visible. Password hint text readable. "Create Account" active tab shown. Form fields and layout correct.

---

### Register — First Name input focused
![s09 register focus](qa/s09-register-input-focus.png)

Green focus border on First Name field. Ring halo again very faint (Finding #5).

---

### Register — Create Account button hover
![s10 register btn hover](qa/s10-register-btn-hover.png)

Hover state same concern as Finding #4 — imperceptible delta.

---

### Loading state — Sign In
![s12 loading](qa/s12-loading-signin.png)

Spinner + "Authenticating…" text render correctly. Button colour is washed-out sage green instead of disabled gray (Finding #2).

---

### Footer — Privacy Policy hover
![s13 footer hover](qa/s13-footer-hover.png)

Footer link hover correctly turns to `--text-primary` (dark). `hover:text-text-primary` token is resolving correctly.

---

### Tab switcher — inactive tab hover
![s14 tab hover](qa/s14-tab-hover.png)

"Create Account" tab shows no visual feedback on hover (Finding #3).

---

## Prioritised fix list

| Priority | Finding | File | Change |
|---|---|---|---|
| P0 | #1 — Checkbox + spacing scale | `index.css` + `checkbox.tsx` + `AuthPage.tsx` | Remove `--spacing-N` from `@theme inline`; use `h-[16px] w-[16px]` for checkbox |
| P1 | #2 — Disabled button colour | `AuthPage.tsx` L111, L177 | Add `disabled:bg-[#d1d5db] disabled:border-[#d1d5db] disabled:pointer-events-none` |
| P1 | #3 — Tab hover state | `AuthPage.tsx` L44, L50 | Add `hover:text-text-primary hover:bg-white/60` to TabsTrigger |
| P2 | #7 — Inactive tab bg colour | `AuthPage.tsx` L44, L50 | Add `bg-transparent` to TabsTrigger className |
| P2 | #5 — Focus ring opacity | `AuthPage.tsx` L76, L92 | `ring-accent-500/15` → `ring-accent-500/25` |
| P2 | #8 — SSO section vertical padding | `AuthPage.tsx` L195 | `py-4` → `py-[16px]`; `border-subtle` → `border-border-subtle` |
| P3 | #4 — Button hover lift | `AuthPage.tsx` L111 | Add `hover:-translate-y-px hover:shadow-sm` |
| P3 | #6 — Hint text font-size | `components/ui/input.tsx` | Remove `text-sm` base class if present |

---

## Computed style reference

Extracted via Playwright + Chromium headless, `localhost:5173/auth`:

```json
{
  "h1":          { "color": "#1f2937",  "fontSize": "20px", "fontWeight": "700" },
  "subtitle":    { "color": "#6b7280",  "fontSize": "14px" },
  "label":       { "color": "#4b5563",  "fontSize": "12px", "fontWeight": "600" },
  "input":       { "height": "36px",    "fontSize": "13px", "borderRadius": "8px",
                   "borderWidth": "1px", "borderColor": "#dfe3e8" },
  "submitBtn":   { "backgroundColor": "#24a06b", "height": "40px",
                   "borderRadius": "10px", "fontWeight": "600" },
  "checkbox":    { "width": "4px",  "height": "4px" },
  "card":        { "borderRadius": "12px", "borderWidth": "1px",
                   "borderColor": "#eceff2", "backgroundColor": "#ffffff" },
  "tabsList":    { "backgroundColor": "#f2f4f6", "borderRadius": "10px" },
  "inactiveTab": { "backgroundColor": "#f6f7f8", "color": "#1f2937" },
  "ssoBtn":      { "height": "34px", "borderRadius": "8px", "color": "#4b5563" },
  "forgotLink":  { "color": "#1b7f55", "fontSize": "12px" }
}
```
