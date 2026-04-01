# Senior Frontend Review Checklist

## 1) Architecture
- Feature folder created for new domain logic.
- Public API exported from `features/<feature>/index.ts`.
- No cross-feature imports bypassing public API.

## 2) Component Quality
- Component has one clear responsibility.
- Props are typed and minimal.
- No business logic hidden in JSX.
- Accessibility attributes present for interactive elements.

## 3) Hook Quality
- Hook name starts with `use`.
- Hook return shape is stable and documented.
- Side effects are explicit and cleanup is present.
- No implicit mutation of external objects.

## 4) State and Data
- Loading/empty/error/stale states implemented.
- API error normalized.
- Derived state not duplicated as source state.

## 5) Reuse and Abstraction
- Repeated code extracted only after clear repetition.
- Shared primitives placed in proper shared/ui folder.
- No speculative abstraction without active callers.

## 6) File Health
- Component <= 220 lines.
- Hook <= 160 lines.
- Utility <= 180 lines.
- File names match exported symbol and domain intent.

## 7) Final Gate
- Typecheck passes.
- Lint passes.
- Relevant tests pass.
- No TODOs without owner/context.
