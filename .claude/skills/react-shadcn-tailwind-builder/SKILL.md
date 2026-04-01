---
name: react-shadcn-tailwind-builder
description: Implement frontend features using React, shadcn/ui, and Tailwind with deterministic patterns for structure, component selection, styling, and command workflow. Use when building or refactoring screens/components in React projects that use shadcn and Tailwind, and when consistent naming, reusable composition, and predictable installation flow are required.
---

# React shadcn Tailwind Builder

Implement UI with a strict workflow: `contract -> scaffold -> compose -> validate`.

## Inputs
- Feature/screen goal.
- Target route or file path.
- Required states: loading, empty, error, success.

## Workflow
1. Define contract before coding.
- List page sections.
- List data fields and UI states.
- Map each section to shadcn components.

2. Install missing components safely.
- Check setup: `npx shadcn info --json`.
- Check availability: `npx shadcn view <component>`.
- Add: `npx shadcn add <component> -y`.
- Use `scripts/pull_component.sh` for deterministic add flow.

3. Build with composition rules.
- Use shadcn primitives first.
- Keep layout in route/page component; move reusable blocks to feature components.
- Keep business logic in hooks/model, not in presentational UI components.

4. Style with token discipline.
- Use Tailwind utility classes mapped to theme tokens.
- Avoid arbitrary values unless token gap is documented.
- Keep responsive behavior explicit at defined breakpoints.

5. Validate before done.
- Typecheck passes.
- Lint passes.
- Required states render correctly.

## Naming and File Conventions
- Components: `PascalCase.tsx`.
- Hooks: `useXxx.ts`.
- Feature entry: `features/<feature>/index.ts`.
- shadcn imports: `@/components/ui/<component>`.
- Shared app UI blocks: `components/shared`.

## Component Selection Guide
- Actions: `button`, `dropdown-menu`, `dialog`, `sheet`.
- Data display: `card`, `table`, `badge`, `avatar`, `progress`.
- Inputs/forms: `input`, `textarea`, `select`, `checkbox`, `radio-group`, `form`.
- Feedback: `alert`, `skeleton`, `toast`, `tooltip`.
- Navigation/layout: `tabs`, `breadcrumb`, `separator`, `scroll-area`, `sidebar`.

## Implementation Rules
- Do not introduce custom base button/input if shadcn variant can satisfy need.
- Wrap repeated shadcn compositions into local feature components.
- Keep className strings readable; extract class variants with `cva` when variants exceed 3 branches.
- Keep each component focused on one intent.

## Anti-Patterns
- Inline giant JSX trees without extraction.
- Mixing fetch logic directly inside page markup blocks.
- Ad-hoc spacing and color values not backed by theme system.
- Installing components blindly without checking availability.

## Resources
- `references/patterns.md`: copy-ready patterns and folder examples.
- `scripts/pull_component.sh`: safe shadcn component pull helper.
