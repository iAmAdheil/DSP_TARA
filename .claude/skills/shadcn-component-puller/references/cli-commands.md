# shadcn CLI command notes

Use these commands in order.

1. Setup validation
- `npx shadcn info --json`

2. Component availability
- `npx shadcn view <component>`
- Fallback search: `npx shadcn search @shadcn -q "<component>"`

3. Install
- `npx shadcn add <component> -y`
- Monorepo: `npx shadcn add <component> -c <workspace_path> -y`

4. Optional inspection before add
- `npx shadcn docs <component>`
