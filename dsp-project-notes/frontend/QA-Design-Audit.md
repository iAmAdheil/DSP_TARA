# TARA Project — QA & Design Audit
**Auditor role:** Senior QA Engineer + Senior Designer
**Goal:** YC-grade polish — credible, professional, production-ready
**Date:** 2026-03-30
**Screenshot:** `screenshots/01-project-workspace.png` (full render captured)

---

## Summary Verdict

The design system foundation is solid — good token system, consistent spacing, clean component classes. However **7 of 9 pages are identical empty states with no CTAs**, the TopNav has a broken interactive, two template chips are non-functional, and several branding choices actively undermine credibility. The fixes below are ordered by impact.

---

## CRITICAL — Fix First

### 1. Font import causing render-blocking in production
**File:** `src/index.css:1`
**Issue:** `@import url('https://fonts.googleapis.com/css2?family=Inter...')` is a synchronous render-blocking import. On slow connections it delays first paint. In the Playwright audit it caused all screenshots after initial load to time out.

**Fix:**
```css
/* Replace the @import with a <link> tag in index.html using font-display swap */
/* Remove line 1 from index.css entirely */
```
In `index.html`, add before `</head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```
This makes font loading non-blocking and eliminates the render stall.

---

### 2. TopNav `getTitle()` falls through to "TARA Project" for `/explorer`
**File:** `src/components/layout/TopNav.tsx:21` (the `default` case)
**Issue:** `/explorer` is not in the switch statement. The page title in the TopNav reads "TARA Project" when on Model Explorer.

**Fix:** Add the missing case:
```tsx
case '/explorer': return 'Model Explorer';
```

---

### 3. Edit/View Mode toggle is broken — always stuck on "Edit Mode"
**File:** `src/components/layout/TopNav.tsx:40-43`
**Issue:** The toggle has no state. "Edit Mode" is always shown active (white pill), "View Mode" is always muted. Clicking "View Mode" does nothing.

**Fix:** Wire it to store state:
```tsx
// In TopNav.tsx, replace the hardcoded div with:
const { viewMode, setViewMode } = useStore(); // add these to store

<div className="h-[32px] rounded-full bg-surface-2 p-[2px] flex items-center shadow-xs ml-4 border border-border-subtle text-[12px] font-medium text-text-muted">
  <div
    onClick={() => setViewMode('edit')}
    className={clsx("rounded-full px-3 py-1 cursor-pointer transition-all", viewMode === 'edit' ? "bg-white text-text-primary shadow-xs" : "hover:text-text-primary")}
  >
    Edit Mode
  </div>
  <div
    onClick={() => setViewMode('view')}
    className={clsx("px-3 py-1 cursor-pointer transition-all", viewMode === 'view' ? "bg-white text-text-primary shadow-xs" : "hover:text-text-primary")}
  >
    View Mode
  </div>
</div>
```

---

### 4. Two of three template chips are non-functional
**File:** `src/pages/SystemIngestion.tsx:88-90`
**Issue:** Only "Connected Car Basic" has an `onClick` handler. "EV Charging Station" and "V2X Component" render as interactive chips but do nothing when clicked.

**Fix:**
```tsx
<span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("The infotainment unit talks to the CAN bus.")}>Connected Car Basic</span>
<span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("An EV charging station exposes a REST API over LTE for remote management. It connects to the OCPP backend and communicates with the vehicle over ISO 15118.")}>EV Charging Station</span>
<span className="filter-chip hover:bg-[#e9edf1]" onClick={() => setTextInput("A V2X roadside unit broadcasts CAM and DENM messages over 802.11p. It connects to a C-ITS backend server over TLS.")}>V2X Component</span>
```

---

### 5. "Clear Input" button is always enabled — should be disabled when input is empty
**File:** `src/pages/SystemIngestion.tsx:99`
**Issue:** `<button className="btn-secondary btn-md">Clear Input</button>` has no `disabled` attribute. It's always clickable even when there's nothing to clear.

**Fix:**
```tsx
<button className="btn-secondary btn-md" disabled={!textInput} onClick={() => setTextInput('')}>
  Clear Input
</button>
```

---

## HIGH — Empty States Killing Product Credibility

### 6. Seven of nine pages show an identical dead-end empty state
**Pages:** Model Explorer, Threat Generation, CVE Matching, Attack Paths, Risk Prioritization, Mitigation Planner, Subsystem Explorer, Reports & Export
**Issue:** Every one of these shows the same pattern: gray circle icon + h2 + optional p. Four of them (CVE, Attack Paths, Risks, Mitigations, Subsystems, Reports) have **zero action buttons** — the user lands on the page and has no path forward.

**Fix strategy:** Each empty state should have:
1. A page-specific icon (already in the nav — reuse it, larger)
2. One sentence explaining what this page does
3. A CTA button pointing to the prerequisite step

Apply this pattern to each dead-end page:

**CVE Matching** (`src/pages/CVEMatching.tsx`):
```tsx
<button className="btn-primary btn-md" onClick={() => navigate('/ingestion')}>
  Go to System Ingestion
</button>
```

**Attack Paths** (`src/pages/AttackPaths.tsx`):
```tsx
<button className="btn-primary btn-md" onClick={() => navigate('/threats')}>
  Go to Threat Generation
</button>
```

**Risk Prioritization**, **Mitigation Planner**, **Subsystem Explorer**, **Reports & Export**: same pattern — add a `btn-primary btn-md` CTA pointing to the logical prerequisite.

---

### 7. Empty states have zero visual differentiation — all look like placeholder/mockup
**All empty state pages**
**Issue:** The gray circle + icon is the same diameter, same color, same treatment on every page. This looks like a Figma placeholder that was never replaced.

**Fix:** Replace the gray circle container with the page's own semantic icon at a larger size, with a light brand-tinted background:
```tsx
// Replace this pattern:
<div className="w-[64px] h-[64px] rounded-full bg-surface-2 flex items-center justify-center mb-[24px]">
  <ShieldAlert className="w-[32px] h-[32px] text-text-muted" />
</div>

// With this (example for Threat Generation):
<div className="w-[72px] h-[72px] rounded-[20px] bg-warning-bg flex items-center justify-center mb-[24px]">
  <ShieldAlert className="w-[36px] h-[36px] text-warning-fg" />
</div>
```
Use the semantic color per page:
- Threat Generation → `bg-warning-bg / text-warning-fg`
- CVE Matching → `bg-danger-bg / text-danger-fg`
- Attack Paths → `bg-danger-bg / text-danger-fg`
- Risk Prioritization → `bg-warning-bg / text-warning-fg`
- Mitigation Planner → `bg-success-bg / text-success-fg`
- Reports & Export → `bg-info-bg / text-info-fg`

---

## HIGH — Branding Issues

### 8. "TARA Project Beta" — "Beta" in the product name is unprofessional
**File:** `src/components/layout/Sidebar.tsx:70`
**Issue:** The sidebar header displays "TARA Project Beta". Showing "Beta" in the brand wordmark signals the product isn't ready. YC and investors see this and immediately lower their confidence bar.

**Fix:**
```tsx
// Change:
<span>TARA Project Beta</span>
// To:
<span>TARA</span>
```
If you must indicate beta status, add a small separate badge:
```tsx
<span className="font-semibold">TARA</span>
<span className="text-[10px] font-bold text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded ml-1.5 leading-none">BETA</span>
```

---

### 9. Workspace icon is a gray placeholder rectangle
**File:** `src/components/layout/Sidebar.tsx:71`
**Issue:** `<div className="w-[16px] h-[16px] rounded bg-border-strong shrink-0">` — this is a blank gray square. It's clearly a placeholder that was never replaced.

**Fix:** Replace with an actual icon:
```tsx
import { Shield } from 'lucide-react'; // or your brand mark

// Replace the div with:
<Shield className="w-[16px] h-[16px] text-accent-500 shrink-0" />
```

---

### 10. "System Status" widget shows hardcoded fake data
**File:** `src/components/layout/Sidebar.tsx:113`
**Issue:** `"All modules fully operational. 248 items stored."` — this is static copy. Investors and evaluators will notice this immediately. Hardcoded status data signals the product isn't real.

**Fix options (pick one):**
- **Option A:** Remove the status widget entirely until it's wired to real data
- **Option B:** Make it dynamic from the store:
```tsx
const { activeRunId, runStats } = useStore();
<p className="text-[12px] text-text-secondary leading-tight">
  {activeRunId ? `Run ${activeRunId} active. ${runStats?.totalItems ?? 0} items stored.` : 'No active run.'}
</p>
```

---

## MEDIUM — UX Issues

### 11. Tabs "Structured Form" and "File Upload" render blank content
**File:** `src/pages/SystemIngestion.tsx:50-69`
**Issue:** Clicking "Structured Form" or "File Upload" switches the tab visually but renders nothing beneath it. The user is presented with an empty layout.

**Fix:** Add placeholder content for unimplemented tabs:
```tsx
{activeTab === 'form' && (
  <div className="flex flex-col items-center justify-center h-[240px] text-center border border-dashed border-border-default rounded-[12px] bg-surface-1">
    <ListTree className="w-[28px] h-[28px] text-text-disabled mb-3" />
    <p className="text-[13px] font-semibold text-text-primary">Structured Form</p>
    <p className="text-[12px] text-text-muted mt-1">Coming in next release</p>
  </div>
)}
{activeTab === 'file' && (
  <div className="flex flex-col items-center justify-center h-[240px] text-center border border-dashed border-border-default rounded-[12px] bg-surface-1">
    <UploadCloud className="w-[28px] h-[28px] text-text-disabled mb-3" />
    <p className="text-[13px] font-semibold text-text-primary">File Upload</p>
    <p className="text-[12px] text-text-muted mt-1">Upload .arxml, .json, or .yaml system models</p>
    <p className="text-[11px] text-text-disabled mt-1">Coming in next release</p>
  </div>
)}
```

---

### 12. Active nav state is indistinguishable from hover state
**File:** `src/components/layout/Sidebar.tsx:92-93`
**Issue:**
- Active: `bg-[#e9edf1]`
- Hover: `bg-[#eef1f4]`
These two colors are nearly identical. A user cannot tell at a glance which page they're on.

**Fix:** Give the active state a left border accent and slightly stronger background:
```tsx
isActive
  ? "bg-[#e9edf1] text-text-primary border-l-2 border-accent-500 pl-[8px]"
  : "text-text-secondary hover:bg-[#eef1f4] hover:text-text-primary border-l-2 border-transparent pl-[8px]"
```

---

### 13. TopNav icon buttons have no tooltips or labels
**File:** `src/components/layout/TopNav.tsx:47-55`
**Issue:** Bell, Settings, and User icon buttons have no `aria-label` or `title`. Bare icon buttons with no context fail basic accessibility and look unfinished.

**Fix:**
```tsx
<button aria-label="Notifications" title="Notifications" className="...">
  <Bell className="w-[18px] h-[18px]" />
</button>
<button aria-label="Settings" title="Settings" className="...">
  <Settings className="w-[18px] h-[18px]" />
</button>
<button aria-label="Account" title="Account" className="...">
  <User className="w-[18px] h-[18px]" />
</button>
```

---

### 14. Run History — "Model Vers" column header is an abbreviation
**File:** `src/pages/RunHistory.tsx:28`
**Issue:** `<th>Model Vers</th>` — "Vers" is a non-standard abbreviation. Professional tools spell it out.

**Fix:**
```tsx
<th className="px-[20px] py-[12px]">Model Version</th>
```

---

### 15. Run History — "Restore" is a bare text link, not a button
**File:** `src/pages/RunHistory.tsx:57`
**Issue:** `<button className="ml-2 text-[12px] text-accent-600 hover:text-accent-500 font-semibold">Restore</button>` — this renders as a plain text hyperlink-style element. Restoring a run is a significant action that should have button affordance and ideally a confirmation dialog.

**Fix:**
```tsx
<button
  className="btn-secondary btn-sm ml-2"
  onClick={() => {/* trigger confirmation modal */}}
>
  Restore
</button>
```

---

### 16. Run History — "Diff Against Active" uses `Copy` icon — semantically wrong
**File:** `src/pages/RunHistory.tsx:56`
**Issue:** The `Copy` icon (`<Copy />`) is used for "Diff Against Active". This is misleading — copy implies clipboard behavior, not a diff/comparison.

**Fix:** Use `GitCompare` or `SplitSquareHorizontal` from lucide-react:
```tsx
import { GitCompare } from 'lucide-react';
// ...
<button title="Diff Against Active"><GitCompare className="w-[14px] h-[14px]" /></button>
```

---

### 17. No pipeline progress indicator
**Issue:** TARA has a clear sequential workflow: Ingest → Explore → Threats → CVE → Paths → Risks → Mitigate → Export. The app shows no visual indication of where the user is in this pipeline, which means:
- First-time users don't understand the flow
- Users don't know what to do next

**Fix:** Add a pipeline breadcrumb or mini-progress bar to the TopNav or at the top of the main content area on each Analysis Engine page. Example concept:

```tsx
// In Shell.tsx or per-page, add above <main>:
const PIPELINE_STEPS = ['ingestion', 'explorer', 'threats', 'cve', 'paths', 'risks', 'mitigations'];
// Render as a horizontal step indicator with completed/active/pending states
```

This single addition would make the product feel like a cohesive tool rather than a collection of independent pages.

---

## LOW — Polish

### 18. `btn-primary` hover color change is imperceptible
**File:** `src/index.css:200`
**Issue:** `hover:bg-accent-600` changes the button from `#24a06b` to `#1b7f55` — approximately 15% darker. On a screen this is nearly invisible, giving the impression that the button has no hover state.

**Fix:** Combine color darkening with a subtle shadow lift for perceptible feedback:
```css
.btn-primary {
  @apply bg-accent-500 text-white border border-accent-500
    hover:bg-accent-600 hover:border-accent-600 hover:shadow-sm hover:-translate-y-px
    active:bg-accent-700 active:translate-y-0
    disabled:bg-[#d1d5db] disabled:border-[#d1d5db] disabled:text-white disabled:pointer-events-none
    transition-all;
}
```

---

### 19. `card-interactive` hover is also barely perceptible
**File:** `src/index.css:239`
**Issue:** `hover:-translate-y-[1px] hover:shadow-sm` — 1px lift is invisible at normal DPI. For dashboard cards this is fine as a subtle affordance but users won't notice it.

**Fix:** Increase to 2px lift and add a slightly more visible shadow:
```css
.card-interactive {
  @apply transition-all hover:-translate-y-[2px] hover:shadow-md cursor-pointer;
}
```

---

### 20. TopNav title is 14px — same size as body text
**File:** `src/components/layout/TopNav.tsx:34`
**Issue:** `text-[14px] font-semibold` for the page title in the header. This is the same font size as regular body copy, creating no visual hierarchy. The page title should feel like a landmark.

**Fix:**
```tsx
<h1 className="text-[15px] font-semibold text-text-primary tracking-tight">
  {getTitle()}
</h1>
```
Or add a breadcrumb for deeper context:
```tsx
<div className="flex flex-col">
  <span className="text-[11px] text-text-muted leading-none mb-0.5">TARA</span>
  <h1 className="text-[14px] font-semibold text-text-primary tracking-tight leading-none">{getTitle()}</h1>
</div>
```

---

---

## Overall Styling Assessment

### What's working
- The design token system is genuinely good — consistent spacing, a proper semantic color layer (`success-bg/fg`, `danger-bg/fg`, etc.), clean neutral palette. Better than most early-stage products.
- Component classes (`btn-primary`, `card-panel`, `filter-chip`) are well-named and DRY.
- Typography scale is thoughtful — 11px labels, 13px body, 14px headings, correct hierarchy in most places.
- The green accent (`#24a06b`) is professional and distinctive for a security tool — not the tired blue.

### What's hurting it

#### The overall feel is "enterprise SaaS skeleton" not "product"
Everything is flat, gray, and safe. There's no visual moment that makes a reviewer think *"this team has taste."* A YC demo needs at least one WOW moment — a data viz, a graph, a meaningful animation — something signaling this is more than CRUD with a sidebar.

#### Too much `bg-[#f9fafb]` everywhere
The app, sidebar, cards, table header — all variations of the same near-white. Depth cues are too subtle. The sidebar at `bg-surface-1` vs the main area at `bg-app` is a ~3 hex value difference. It reads as one flat plane.

**Fix:** Give the sidebar a distinctly darker background — `#f0f2f5` minimum, or consider a dark sidebar (`#1a1f2e` with white text) for a modern tool aesthetic. This single change would immediately give the layout visual structure.

#### Sidebar has too many nav groups
Five groups for ~10 items feels bureaucratic. The `OVERVIEW`, `MODEL PROCESSING`, `ANALYSIS ENGINE`, `RESOLUTION`, `RECORDS` labels are all-caps 11px tracked text — the Linear/Notion pattern — but the content doesn't justify this much hierarchy.

**Fix:** Collapse to 3 groups max:
- **Workspace** (Project Workspace)
- **Analysis** (System Ingestion, Model Explorer, Threat Generation, CVE Matching, Attack Paths, Risk Prioritization)
- **Outputs** (Mitigation Planner, Subsystem Explorer, Reports & Export, Run History)

#### Button sizing is inconsistent across the app
- Project Workspace CTAs: `btn-lg` (40px)
- System Ingestion actions: `btn-md` (34px)
- Run History row actions: icon-only `p-1.5`

Three different visual weights for "things you can click" with no clear hierarchy rule. The interactive weight should be predictable.

**Fix:** Establish a rule — primary page CTAs use `btn-lg`, secondary/utility actions use `btn-md`, table/inline actions use `btn-sm`. Apply consistently.

#### No color in the content area
The only color is the green "Start New Run" button and the status tags. Everything else is gray. For a threat analysis product — which inherently deals with critical/high/medium/low risk levels — the UI should breathe semantic color into data surfaces, not reserve it only for tags.

**Fix:** On populated pages (Run History table, future Threat list, Risk scoring), use the semantic color tokens on row indicators, left-border accents on cards, and risk-level badges more aggressively.

#### Product title is unexplained and browser tab shows `dsp-frontend`
The sidebar says "TARA Project Beta", the browser `<title>` tag shows "dsp-frontend". For a YC demo, the product name should be visible in the tab and there should be one line somewhere explaining what TARA stands for.

**Fix in `index.html`:**
```html
<title>TARA — Threat Analysis & Risk Assessment</title>
```
Add a subtitle or tooltip on the sidebar wordmark explaining the acronym.

---

## Fix Priority Order

| # | Fix | File | Impact | Effort |
|---|-----|------|--------|--------|
| 1 | Font render-blocking | `index.css:1` + `index.html` | Perf + Screenshots | Low |
| 2 | `/explorer` title bug | `TopNav.tsx:21` | Bug | Trivial |
| 3 | Edit/View Mode broken | `TopNav.tsx:40-43` + store | Credibility | Low |
| 4 | Template chips non-functional | `SystemIngestion.tsx:88-90` | Bug | Trivial |
| 5 | Clear Input always enabled | `SystemIngestion.tsx:99` | Bug | Trivial |
| 6 | 7 dead-end empty states | All placeholder pages | Credibility | Medium |
| 7 | Empty state visual differentiation | All empty state pages | Polish | Low |
| 8 | "Beta" in product name | `Sidebar.tsx:70` | Credibility | Trivial |
| 9 | Gray placeholder icon | `Sidebar.tsx:71` | Credibility | Trivial |
| 10 | Hardcoded system status | `Sidebar.tsx:113` | Credibility | Low |
| 11 | Blank tabs | `SystemIngestion.tsx:50-69` | UX | Low |
| 12 | Active vs hover nav | `Sidebar.tsx:92-93` | UX | Low |
| 13 | Icon buttons no labels | `TopNav.tsx:47-55` | A11y | Trivial |
| 14 | "Model Vers" abbreviation | `RunHistory.tsx:28` | Polish | Trivial |
| 15 | Restore as text link | `RunHistory.tsx:57` | UX | Low |
| 16 | Wrong icon for Diff | `RunHistory.tsx:56` | Polish | Trivial |
| 17 | No pipeline indicator | Shell-level | UX | Medium |
| 18 | btn-primary hover invisible | `index.css:200` | Polish | Low |
| 19 | card-interactive lift weak | `index.css:239` | Polish | Low |
| 20 | TopNav title too small | `TopNav.tsx:34` | Polish | Trivial |
