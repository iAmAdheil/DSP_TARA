# Theme System Specification - TARA Application

## 1) Design Direction
- Visual style: low-noise enterprise UI with soft neutral surfaces and restrained accent usage.
- Primary tone: light, clean, subdued contrast with high readability.
- Accent tone: security-trust green used only for interactive emphasis and status confirmation.
- Density: compact-to-comfortable, optimized for dashboard workflows.
- Consistency rule: all UI must resolve to tokenized values only; no one-off hex values.

## 2) Global Design Tokens (Source of Truth)

### 2.1 Color Tokens
```css
:root {
  /* Base neutrals */
  --bg-app: #f6f7f8;
  --bg-surface-0: #ffffff;
  --bg-surface-1: #f9fafb;
  --bg-surface-2: #f2f4f6;
  --bg-overlay: rgba(17, 24, 39, 0.48);

  /* Borders */
  --border-subtle: #eceff2;
  --border-default: #dfe3e8;
  --border-strong: #cfd6de;
  --border-focus: #24a06b;

  /* Text */
  --text-primary: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --text-disabled: #9ca3af;
  --text-inverse: #ffffff;

  /* Brand/Accent */
  --accent-50: #eefbf4;
  --accent-100: #d9f6e6;
  --accent-200: #b4edcd;
  --accent-300: #87ddb0;
  --accent-400: #4fc78a;
  --accent-500: #24a06b;
  --accent-600: #1b7f55;
  --accent-700: #166445;

  /* Semantic */
  --success-bg: #eefbf4;
  --success-fg: #166445;
  --warning-bg: #fff7e8;
  --warning-fg: #92400e;
  --danger-bg: #fff1f2;
  --danger-fg: #b42318;
  --info-bg: #eef5ff;
  --info-fg: #1d4ed8;

  /* Risk severity */
  --risk-critical: #b42318;
  --risk-high: #d14343;
  --risk-medium: #c27a10;
  --risk-low: #2f855a;
  --risk-info: #2563eb;
}
```

### 2.2 Typography Tokens
```css
:root {
  --font-sans: "Inter", "SF Pro Text", "Segoe UI", sans-serif;

  --fs-11: 11px;
  --fs-12: 12px;
  --fs-13: 13px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-18: 18px;
  --fs-20: 20px;

  --lh-16: 16px;
  --lh-18: 18px;
  --lh-20: 20px;
  --lh-22: 22px;
  --lh-24: 24px;
  --lh-28: 28px;

  --fw-400: 400;
  --fw-500: 500;
  --fw-600: 600;
  --fw-700: 700;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
}
```

### 2.3 Spacing, Radius, Border, Shadow Tokens
```css
:root {
  --space-2: 2px;
  --space-4: 4px;
  --space-6: 6px;
  --space-8: 8px;
  --space-10: 10px;
  --space-12: 12px;
  --space-14: 14px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;

  --radius-4: 4px;
  --radius-6: 6px;
  --radius-8: 8px;
  --radius-10: 10px;
  --radius-12: 12px;
  --radius-16: 16px;
  --radius-pill: 999px;

  --bw-1: 1px;
  --bw-2: 2px;

  --shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-md: 0 4px 10px rgba(16, 24, 40, 0.10), 0 2px 4px rgba(16, 24, 40, 0.06);
}
```

### 2.4 Motion Tokens
```css
:root {
  --dur-100: 100ms;
  --dur-150: 150ms;
  --dur-200: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.1, 0.9, 0.2, 1);
}
```

## 3) Layout & Shell System

### 3.1 Application Shell
- App background: `var(--bg-app)`.
- Max height: `100vh`; overflow strategy: sidebar fixed, content scrolls.
- Grid template:
  - Sidebar width expanded: `248px`.
  - Sidebar width collapsed: `72px`.
  - Main content: `1fr`.

### 3.2 Z-index Layers
- Sidebar/header base: `10`.
- Dropdown/popover: `30`.
- Modal backdrop: `40`.
- Modal container: `50`.
- Toast: `60`.

## 4) Component Style Contracts

## 4.1 Sidebar

### Container
- Background: `var(--bg-surface-1)`.
- Border-right: `1px solid var(--border-subtle)`.
- Padding: `12px 10px`.

### Workspace Selector
- Height: `36px`; horizontal padding: `10px`.
- Background default: `transparent`.
- Hover: `var(--bg-surface-2)`.
- Border radius: `8px`.
- Text: `13px/20px`, `fw-600`, `text-primary`.

### Nav Item
- Height: `34px`; padding: `0 10px`; gap: `8px`.
- Border radius: `8px`.
- Default text/icon: `text-secondary`.
- Hover background: `#eef1f4`.
- Active background: `#e9edf1`.
- Active text/icon: `text-primary`.
- Keyboard focus: `2px solid var(--border-focus)` outline offset `1px`.

### Section Labels
- Text: `11px/16px`, `fw-600`, uppercase optional, `text-muted`.
- Margin-top before label groups: `16px`.

### Trial/Info Card (sidebar utility card)
- Background: linear gradient `135deg, #f3f6f8 0%, #eefbf4 100%`.
- Border: `1px solid #e7ecef`.
- Radius: `10px`.
- Padding: `12px`.

## 4.2 Top Navigation Bar

### Container
- Height: `56px`.
- Background: `var(--bg-surface-0)`.
- Bottom border: `1px solid var(--border-subtle)`.
- Horizontal padding: `0 20px`.

### Title + Mode Switch
- Title text: `14px`, `fw-600`, `text-primary`.
- Segment control container: `32px` height, `radius-pill`.
- Segment bg: `var(--bg-surface-2)`.
- Active segment: white bg, subtle shadow `var(--shadow-xs)`.

### Utility Actions (preferences, credits, profile)
- Icon button size: `32px`.
- Border: `1px solid transparent` default.
- Hover bg: `var(--bg-surface-2)`.
- Focus ring: `2px solid var(--border-focus)`.

## 4.3 Page Header / Breadcrumb / Tabs
- Header region padding: `16px 20px 12px`.
- Breadcrumb text: `12px`, `text-muted`.
- Page title: `20px/28px`, `fw-700`, `tracking-tight`, `text-primary`.
- Tabs:
  - Height `32px`, padding `0 12px`.
  - Inactive text: `text-secondary`.
  - Active text: `text-primary`; active underline `2px solid var(--accent-500)`.

## 4.4 Search Composer (Core Input Panel)

### Composer Container
- Width: fluid, cap `760px`.
- Background: `var(--bg-surface-0)`.
- Border: `1px solid var(--border-default)`.
- Radius: `12px`.
- Shadow: `var(--shadow-sm)` (only when elevated/hero placement).

### Text Area
- Min-height: `96px`.
- Padding: `14px 14px 10px`.
- Text: `14px/22px`, `text-primary`.
- Placeholder: `text-disabled`.
- No hard inset borders.

### Footer Row (filters + submit)
- Top border: `1px solid var(--border-subtle)`.
- Padding: `10px`.
- Gap: `8px`.

### Composer States
- Focus-within: border `var(--border-focus)` + outer ring `0 0 0 3px rgba(36, 160, 107, 0.15)`.
- Error: border `#d14343`, helper text `danger-fg`.
- Disabled: bg `#f8f9fb`, text `text-disabled`.

## 4.5 Inputs (Global)

### Text Input / Select
- Height: `36px`.
- Radius: `8px`.
- Border: `1px solid var(--border-default)`.
- Background: white.
- Padding: `0 12px`.
- Text: `13px`, `text-primary`.
- Placeholder: `text-muted`.

### States
- Hover: border `var(--border-strong)`.
- Focus: border `var(--border-focus)` + ring `0 0 0 3px rgba(36,160,107,0.15)`.
- Error: border `#d14343`; helper `12px` danger text.
- Disabled: bg `#f7f8fa`, border `#e8ecf0`, text `text-disabled`.

## 4.6 Buttons

### Size Scale
- `sm`: height `30px`, padding `0 10px`, font `12px fw-600`.
- `md`: height `34px`, padding `0 12px`, font `13px fw-600`.
- `lg`: height `40px`, padding `0 14px`, font `14px fw-600`.

### Primary Button
- Bg: `var(--accent-500)`.
- Text: `white`.
- Border: `1px solid var(--accent-500)`.
- Hover: bg/border `var(--accent-600)`.
- Active: `var(--accent-700)`.
- Disabled: bg `#d1d5db`, border `#d1d5db`, text `#ffffff`.

### Secondary Button
- Bg: `white`.
- Text: `text-primary`.
- Border: `1px solid var(--border-default)`.
- Hover bg: `var(--bg-surface-2)`.
- Active bg: `#e8edf1`.

### Ghost Button
- Bg: transparent.
- Text: `text-secondary`.
- Hover bg: `var(--bg-surface-2)`.
- Active bg: `#e8edf1`.

### Destructive Button
- Bg: `#b42318`.
- Border: `#b42318`.
- Hover: `#912018`.

### Universal Focus Style
- `outline: 2px solid var(--border-focus); outline-offset: 1px;`

## 4.7 Chips, Pills, Tags

### Filter Chip
- Height: `28px`.
- Padding: `0 10px`.
- Radius: `8px`.
- Border: `1px solid var(--border-default)`.
- Bg: `#f8fafb`.
- Text: `12px`, `text-secondary`.

### Selected Chip
- Bg: `var(--accent-50)`.
- Border: `1px solid var(--accent-200)`.
- Text: `var(--accent-700)`.

### Severity Tag
- `Critical`: bg `#fff1f2`, text `#b42318`.
- `High`: bg `#fff4f1`, text `#d14343`.
- `Medium`: bg `#fff7e8`, text `#9a6700`.
- `Low`: bg `#eefbf4`, text `#166445`.

## 4.8 Cards & Panels
- Background: white.
- Border: `1px solid var(--border-subtle)`.
- Radius: `12px`.
- Padding default: `16px`.
- Header title: `14px`, `fw-600`, `text-primary`.
- Supporting text: `13px`, `text-secondary`.
- Hover (clickable card): translateY(-1px), shadow `var(--shadow-sm)`.

## 4.9 Tables / Data Grid
- Header bg: `#f8fafb`.
- Header text: `12px fw-600`, `text-muted`.
- Row height: `40px`.
- Row border-bottom: `1px solid var(--border-subtle)`.
- Row hover: `#f9fbfc`.
- Selected row: `#eefbf4` with left accent bar `3px var(--accent-500)`.
- Cell text: `13px`, `text-primary`.

## 4.10 Left Tree / Asset List
- Group label: `11px fw-600 text-muted`.
- Node height: `30px`.
- Node indent: increments of `16px` per level.
- Node hover bg: `#f2f5f7`.
- Node active bg: `#eaf5ef`, text `accent-700`.

## 4.11 Empty States
- Icon container: `40px`, round, bg `#f3f5f7`.
- Title: `16px fw-600 text-primary`.
- Body: `13px text-secondary`.
- CTA: primary button `md`.

## 4.12 Modals / Drawers

### Modal
- Backdrop: `var(--bg-overlay)`.
- Surface: white; radius `12px`; border `1px solid var(--border-subtle)`.
- Width presets: `480px`, `720px`, `960px`.
- Header/footer separators: `1px solid var(--border-subtle)`.

### Right Drawer
- Width presets: `360px`, `480px`, `640px`.
- Border-left: `1px solid var(--border-subtle)`.
- Internal sections separated by subtle divider.

## 4.13 Tooltips / Popovers / Menus
- Surface bg: white.
- Border: `1px solid var(--border-default)`.
- Radius: `8px`.
- Shadow: `var(--shadow-md)`.
- Padding: `8px` (menu), `10px` (popover).
- Menu item: `32px` height; hover bg `#f4f7f9`; active bg `#ecf2f6`.

## 4.14 Notifications / Toasts / Inline Alerts

### Toast
- Radius: `10px`, border `1px solid` tokenized by intent.
- Success: bg `--success-bg`, text `--success-fg`, border `#b4edcd`.
- Warning: bg `--warning-bg`, text `--warning-fg`, border `#f6dfb3`.
- Danger: bg `--danger-bg`, text `--danger-fg`, border `#f2c6cc`.

### Inline Alert
- Padding: `10px 12px`.
- Left icon fixed `16px`.
- Border left accent `3px` by intent color.

## 4.15 Progress, Skeleton, and Loaders
- Linear progress track: `#edf1f4`, fill `accent-500`, height `6px`, radius `999px`.
- Spinner: 16/24 px variants; stroke `accent-500`.
- Skeleton: base `#eef2f5`, shimmer `#f7f9fb`, radius `6px`.

## 4.16 Charts / Risk Visuals
- Gridline: `#eef2f5`.
- Axis text: `12px text-muted`.
- Palette:
  - Critical `#b42318`
  - High `#d14343`
  - Medium `#c27a10`
  - Low `#2f855a`
  - Informational `#2563eb`
- Hover tooltip card follows popover style.

## 4.17 2D/3D Subsystem Explorer Styling
- Scene background: `#f4f6f8`.
- Vehicle/subsystem neutral material: `#dce2e8`.
- Interactive subsystem hover: tint `#c8eedb`.
- Selected subsystem: fill `#87ddb0`, outline `#1b7f55` 2px.
- Risk heat overlay:
  - Critical `rgba(180,35,24,0.72)`
  - High `rgba(209,67,67,0.64)`
  - Medium `rgba(194,122,16,0.56)`
  - Low `rgba(47,133,90,0.52)`

## 5) Interaction States (Global Rules)
- `default`: tokenized base style.
- `hover`: bg/ border increase contrast by one token step.
- `active`: deeper surface or accent shade.
- `focus-visible`: mandatory focus ring style.
- `disabled`: reduced contrast, no shadows, no transform.
- `loading`: preserve width, replace label with spinner + muted label.

## 6) Accessibility Rules
- Minimum text contrast: 4.5:1 for normal text, 3:1 for large text/UI icons.
- Focus indicators required on all interactive elements.
- Minimum hit area: `32x32px` for icon-only controls.
- Do not convey severity using color alone; include label/icon.

## 7) Spacing & Composition Rules
- Page outer padding: `20px` desktop, `16px` tablet, `12px` mobile.
- Vertical rhythm between major sections: `16px` or `24px` only.
- Component internal padding must use spacing tokens only.
- Avoid nested surfaces with same border color without separator; step surface level (`0 -> 1 -> 2`).

## 8) Responsive Behavior
- Sidebar collapses below `1200px`.
- Composer width becomes full at `<900px`.
- Multi-column analytics panels collapse to single column at `<1024px`.
- Table overflows to horizontal scroll at `<860px`.
- Sticky top bar stays fixed in all breakpoints.

## 9) Implementation Constraints for Developer Agent
- No hardcoded colors, spacing, radii, or shadows outside tokens.
- No custom component variants without adding explicit token + spec entry.
- If a required style is not defined here, implementer must extend this document first, then code.
- Use semantic class names (`btn-primary`, `nav-item-active`, `risk-tag-high`) mapped to tokens.
- Preserve visual consistency over local optimization.

## 10) Baseline CSS Variable Map for Immediate Use
```css
/* Minimum required variables for v1 implementation */
:root {
  --app-bg: var(--bg-app);
  --surface: var(--bg-surface-0);
  --surface-subtle: var(--bg-surface-1);
  --border: var(--border-default);
  --text: var(--text-primary);
  --text-subtle: var(--text-secondary);
  --primary: var(--accent-500);
  --primary-hover: var(--accent-600);
  --focus: var(--border-focus);
  --radius-sm: var(--radius-8);
  --radius-md: var(--radius-12);
  --shadow-sm: var(--shadow-sm);
}
```

## 11) Component Checklist (Must Match Before Merge)
- Sidebar
- Top navbar
- Global buttons (all variants)
- Inputs/selects/textarea
- Search composer
- Chips/tags/badges
- Cards/panels
- Data table/list rows
- Modal/drawer
- Popover/menu/tooltip
- Alerts/toasts
- Loader/skeleton/progress
- Charts and risk legend
- Subsystem explorer (2D/3D if present)

If any implemented component diverges from this spec, update this spec first and record the reason in the commit message.
