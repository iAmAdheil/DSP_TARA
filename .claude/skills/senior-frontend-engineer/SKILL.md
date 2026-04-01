---
name: senior-frontend-engineer
description: Enforce senior-level frontend engineering standards for architecture, component design, hooks, state management, testing, and maintainability. Use when implementing or refactoring frontend features and when the user wants predictable file structure, strict quality gates, reusable patterns, and low-tech-debt outcomes instead of ad-hoc vibe-coded code.
---

# Senior Frontend Engineer

Execute frontend work with architecture-first discipline and production-quality guardrails.

## Operating Mode
- Build only after defining page-level data and state contract.
- Prefer boring, composable patterns over clever abstractions.
- Optimize for long-term maintainability, not shortest patch.
- Reject ambiguous requirements by encoding assumptions in code comments or TODO contracts.

## Directory and File Structure Rules
Use this baseline structure unless project conventions already exist.

```text
src/
  app/
    routes/
    providers/
  features/
    <feature-name>/
      api/
      components/
      hooks/
      model/
      utils/
      index.ts
  components/
    ui/
    shared/
  hooks/
  lib/
  styles/
  types/
```

- Keep business logic inside `features/<feature>/model` and `features/<feature>/hooks`.
- Keep cross-feature primitives in `components/shared`, not in feature folders.
- Keep design-system wrappers in `components/ui` only.
- Export feature public surface from `features/<feature>/index.ts`.
- Prevent deep relative imports (`../../../`) by using aliases.

## File Size and Complexity Limits
- Keep component files <= 220 lines.
- Keep hooks <= 160 lines.
- Keep utility modules <= 180 lines.
- Keep files <= 3 levels of nesting in JSX.
- Split file when it has more than one primary responsibility.
- Split file when cyclomatic complexity becomes hard to explain in 3 bullets.

## Component Creation Rules
- Create a component only when markup or behavior repeats 2+ times or is semantically reusable.
- Keep presentational components pure (props in, UI out).
- Keep side effects out of presentational components.
- Co-locate feature-specific components under `features/<feature>/components`.
- Define explicit prop types; avoid `any` and opaque `object` props.
- Expose variant behavior through typed props, not ad-hoc class concatenation in parent callers.

## Hook Creation Rules
- Create custom hooks for reusable stateful logic, not for single-line wrappers.
- Prefix all hooks with `use` and keep hook API minimal.
- Return stable shape (`{ data, isLoading, error, actions }`) for async hooks.
- Encapsulate network + transform logic in feature hooks, not page components.
- Do not mutate external state inside hooks without explicit action methods.

## Reusability and Abstraction Rules
- Apply rule of three before extracting abstractions.
- Extract utilities only when behavior is domain-agnostic and tested.
- Keep feature constants local unless shared by 2+ features.
- Reuse shadcn primitives before creating custom base components.
- Avoid copy-paste by introducing composition points (`render prop`, `slot`, or child components) only when needed.

## State Management Rules
- Keep server state separate from UI state.
- Keep ephemeral UI state local; avoid global stores for local toggles.
- Use global store only for cross-route state that must persist.
- Derive computed state from source-of-truth; avoid duplicate state copies.
- Encode state machines for multi-step workflows where invalid transitions are possible.

## Data Fetching and API Rules
- Keep API clients in `features/<feature>/api`.
- Normalize API errors into one internal error model.
- Parse/validate external payloads before use.
- Never let view components know transport details.
- Handle loading, empty, error, and stale states explicitly on each data surface.

## Styling and UI Consistency Rules
- Use design tokens only; do not hardcode one-off values.
- Keep style decisions in theme/system docs, not random component edits.
- Keep layout primitives consistent (`Stack`, `Grid`, container spacing conventions).
- Keep responsive behavior explicit with defined breakpoints.
- Keep accessibility non-optional: keyboard focus, labels, semantic elements.

## Testing and Quality Gates
- Add unit tests for domain utilities and non-trivial hooks.
- Add integration tests for feature flows with async states.
- Add regression tests when fixing bugs.
- Keep lint/typecheck passing before considering task done.
- Verify loading/empty/error rendering paths for every new feature module.

## PR Review Bar
Ship only when all are true:
- Structure follows feature boundaries.
- No oversized files or god-components.
- No duplicated business logic across modules.
- No hidden side-effects in render path.
- No unhandled async states.
- No accessibility regressions in interactive controls.

Use the checklist in `references/review-checklist.md` during implementation and review.

## Anti-Patterns to Reject
- Massive page components mixing fetch, transforms, and UI.
- Hook soup with unclear ownership and circular dependencies.
- Utility dumping ground (`helpers.ts`) without domain boundaries.
- Premature abstraction layers with no concrete reuse.
- Silent `catch` blocks and swallowed errors.
