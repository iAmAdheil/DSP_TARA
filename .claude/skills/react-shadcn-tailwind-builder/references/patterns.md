# React + shadcn + Tailwind Patterns

## Feature Folder Pattern
```text
features/<feature>/
  components/
  hooks/
  model/
  index.ts
```

## Page Composition Pattern
1. Route/page shell
2. Filter/action bar
3. Data container block
4. Detail drawer/modal
5. State overlays (loading/empty/error)

## State Rendering Pattern
- `isLoading`: render skeletons with stable layout.
- `isError`: render inline alert with retry action.
- `isEmpty`: render empty-state with primary CTA.
- else: render content.

## shadcn Import Pattern
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

## cva Pattern
Use `cva` for variant-heavy reusable elements.
- Keep variants typed.
- Keep defaults explicit.
- Avoid deeply nested compound variants.
