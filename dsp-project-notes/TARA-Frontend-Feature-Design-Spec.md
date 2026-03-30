# Frontend Feature Design Specification - TARA

## 1) Objective
Define exact UI behavior for each feature so engineering implementation is deterministic and low-interpretation. This document complements the theme token system and focuses on feature-level page contracts, state handling, and interaction logic.

## 2) Global UX Contract (Applies Everywhere)
- Every page must support: `loading`, `partial-loading`, `empty`, `error`, `stale-data`, and `success` states.
- Every data block must have a skeleton variant and no-layout-shift behavior.
- Every async action must expose progress feedback within 300ms.
- Every table/list must include explicit empty-state messaging and next action CTA.
- Every API error must map to one of: `validation`, `network`, `permission`, `server`, `unknown`.
- No silent failure.

## 3) Information Architecture (Primary Screens)
- `Project Workspace` (root shell)
- `System Ingestion` (input and parsing)
- `Canonical Model Explorer` (assets/interfaces graph + detail panes)
- `Threat Generation` (threat register)
- `CVE Matching` (component vulnerability mapping)
- `Attack Paths` (path graph + ranked list)
- `Risk Prioritization` (scores, filters, queue)
- `Mitigation Planner` (controls + what-if)
- `Subsystem Explorer` (2D default, 3D optional)
- `Reports & Export`
- `Run History`

## 4) Page-Level Feature Specs

## 4.1 Project Workspace
### Page elements
- Top navbar: run selector, run status chip, export shortcut, preferences.
- Left sidebar: navigation groups, active route highlight, recent runs section.
- Main body: project summary cards (`assets`, `threats`, `high-risk items`, `last updated`).

### Loading state
- Summary cards skeleton.
- Sidebar route labels visible immediately; counts load progressively.

### Empty state
- Message: "No analysis run yet."
- Primary CTA: `Start New Run`.
- Secondary CTA: `Import Previous Run JSON`.

### Error state
- Inline banner in main body.
- Retry button with exponential backoff indicator.

## 4.2 System Ingestion
### Page elements
- Input mode tabs: `Text`, `Structured Form`, `File Upload`.
- Main composer panel.
- Right panel: extraction preview + model quality score + assumption register.
- Footer actions: `Validate Input`, `Build Model`.

### Validation behaviors
- Required fields: asset name/type, interface protocol, software id/version (or explicit unknown).
- Field-level errors inline.
- Submit disabled until minimum required data present.

### Loading state
- Parsing spinner in preview panel.
- Progressive extraction rows (assets first, then interfaces, then trust boundaries).

### Empty state
- Sample prompt templates shown as chips.
- Example file formats list with download links (if available).

### Error state
- Parsing failure panel with exact offending section.
- CTA: `Edit Input` and `Use Fallback Parser`.

## 4.3 Canonical Model Explorer
### Page elements
- Split view: left graph/tree, right detail inspector.
- Top controls: filter by subsystem, protocol, trust boundary.
- Detail inspector tabs: `Metadata`, `Relations`, `Evidence`.

### Interactions
- Node click = inspector updates.
- Multi-select = aggregate relation summary.
- Path highlight toggles from selected node.

### Loading state
- Graph canvas placeholder shimmer.
- Inspector shows "Select an item" until data ready.

### Empty state
- Message: "No model generated from ingestion."
- CTA: `Go to System Ingestion`.

### Error state
- Graph render fallback to tabular model view.

## 4.4 Threat Generation
### Page elements
- Header controls: generate button, framework selector (STRIDE/HEAVENS mode), confidence threshold.
- Threat table columns:
  - ID
  - Title
  - Category
  - Entry Point
  - Impacted Asset
  - Safety Impact
  - Confidence
  - Status (`potential`, `reviewed`, `accepted`)
- Row drawer with full threat object and evidence refs.

### Loading state
- Table skeleton rows (minimum 8).
- Progress meter: analyzed assets / total assets.

### Empty state
- Message: "No threats generated yet."
- CTA: `Generate Threats`.

### Error state
- Recovery action: `Regenerate with Lower Strictness`.

## 4.5 CVE Matching
### Page elements
- Filter bar: subsystem, severity, match tier.
- Matrix view: component rows, CVE columns (or list mode toggle).
- Relevance panel showing `why_relevant`, CPE match details, published date.

### Rules
- Tier badges mandatory (`Exact`, `Near`, `Contextual`).
- Tier 2/3 must show uncertainty warning icon.

### Loading state
- Component list loads first.
- CVE rows progressively append.

### Empty state
- Option A: no software version data.
  - CTA: `Add Versions in Ingestion`.
- Option B: no CVEs matched.
  - Message: "No known CVEs for current component profile."

### Error state
- Distinguish data source unavailable vs parsing failure.
- Provide retry timestamp and manual refresh action.

## 4.6 Attack Paths
### Page elements
- Left: ranked path list with risk chips.
- Right: attack path stepper/graph.
- Metadata block: required capabilities, feasibility, impact.

### Interactions
- Selecting a path highlights impacted assets across graph.
- Step click reveals linked threat + CVE references.

### Loading state
- Placeholder path cards + disabled graph controls.

### Empty state
- Message: "No valid multi-step paths found from current model."
- CTA: `Review Trust Boundaries`.

### Error state
- If graph traversal fails, show list-only mode and diagnostics panel.

## 4.7 Risk Prioritization
### Page elements
- Priority queue board (`Critical`, `High`, `Medium`, `Low`).
- Sort controls: `risk score`, `safety impact`, `exploitability`, `effort`.
- Explainability drawer with factor weights and intermediate values.

### Behaviors
- Risk score chip always clickable to open calculation detail.
- Bulk actions: assign owner, mark reviewed, add mitigation candidate.

### Loading state
- Queue columns render immediately with skeleton cards.

### Empty state
- Message: "No scored items yet."
- CTA: `Run Risk Scoring`.

### Error state
- Fallback to latest successful scoring snapshot with stale badge.

## 4.8 Mitigation Planner
### Page elements
- Left list: top risks.
- Center: recommended controls per selected risk.
- Right panel: implementation effort, expected risk delta, validation steps.
- Action row: `Apply in Simulation`, `Add to Action Plan`.

### What-if simulation state
- Compare card: before score vs after score.
- Delta chart required for top 5 impacted items.

### Loading state
- Recommendation cards skeleton with persistent selected risk context.

### Empty state
- Message: "No mitigation recommendations available."
- CTA: `Generate Recommendations`.

### Error state
- If simulation fails, keep baseline and show failed scenario details.

## 4.9 Subsystem Explorer (2D/3D)
### Page elements
- Toggle: `2D Schematic` / `3D View`.
- Layer controls: `risk heat`, `attack surfaces`, `trust boundaries`, `controls`.
- Click panel: selected subsystem summary with linked risks/CVEs.

### Behaviors
- Hover state shows subsystem name + risk count.
- Click isolates subsystem and syncs filters across threat/CVE/risk modules.

### Loading state
- 2D loads first; 3D lazy-load with progress indicator.

### Empty state
- If no subsystem mapping: prompt to map assets to vehicle domains.

### Error state
- 3D failure auto-falls back to 2D with notification.

## 4.10 Reports & Export
### Page elements
- Export format selector: JSON / Markdown / PDF.
- Include options: raw evidence, path details, mitigation backlog.
- Preview pane with section checklist.

### Loading state
- Export job progress bar with stage labels (`prepare`, `render`, `package`).

### Empty state
- If no completed run: disable export and show dependency checklist.

### Error state
- Failed export card with downloadable logs.

## 4.11 Run History
### Page elements
- Timeline/list with run ID, timestamp, status, duration, model version.
- Diff action between two runs.
- Restore action to reopen snapshot.

### Loading state
- Skeleton list rows.

### Empty state
- Message: "No prior runs." with CTA `Run First Analysis`.

### Error state
- Local cache fallback indicator + reload action.

## 5) Reusable UI Pattern Contracts

## 5.1 Tables
- Sticky header required for datasets > 20 rows.
- Pagination or virtualization required for > 200 rows.
- Row actions must be visible on hover and keyboard focus.

## 5.2 Drawers
- Right-side drawer default for row details.
- Preserve scroll position when closing/reopening.

## 5.3 Filters
- Global filter chips must reflect active state and be removable individually.
- `Clear all` only enabled when at least one filter is active.

## 5.4 Banners and Alerts
- Top-of-page banner reserved for cross-module issues.
- Inline alerts for block-level issues only.

## 5.5 Status Chips
- Standard statuses only: `queued`, `running`, `completed`, `failed`, `stale`.
- Severity chips must always include text label.

## 6) Data State Matrix (By Component Type)

### Chart widget
- Loading: skeleton chart area + axis placeholders.
- Empty: no-data panel + filter reset CTA.
- Error: fallback text summary + retry.

### List widget
- Loading: 6 skeleton rows.
- Empty: compact card with icon + single CTA.
- Error: inline row with diagnostic message.

### Detail inspector
- Loading: label/value skeleton.
- Empty: selection prompt.
- Error: metadata unavailable panel.

## 7) Micro-Interaction Rules
- Debounce search/filter inputs at 250ms.
- Optimistic updates allowed only for local UI flags (`reviewed`, `selected`), not risk score mutations.
- Toast on successful async action; inline error on failure.
- Long task (>6s) must show cancellable progress state.

## 8) Accessibility and Usability Baseline
- Keyboard path for every primary action.
- Focus trap required in modal/drawer.
- Aria labels on icon-only controls.
- Screen-reader summary for risk severity changes.

## 9) Routing and URL State
- Persist module filters in query params.
- Persist selected run ID in URL.
- Deep-linkable drawer state for threat/CVE detail IDs.

## 10) Acceptance Checklist for Frontend Completion
- Each module has complete page-state coverage (loading/empty/error/stale/success).
- No table/list without explicit empty-state UX.
- No async action without progress and failure path.
- No component style divergence from theme spec unless documented.
- 2D explorer works even if 3D fails.
- Export flow provides deterministic completion or actionable error.

## 11) Build Sequence Recommendation (Implementation Order)
1. Shell + routing + global state containers.
2. System Ingestion + Canonical Model Explorer.
3. Threat Generation + CVE Matching.
4. Attack Paths + Risk Prioritization.
5. Mitigation Planner + Reports.
6. Subsystem Explorer 2D, then optional 3D.
7. Run History + diff.

This order minimizes dependency blocking and enables incremental demos with meaningful outputs.
