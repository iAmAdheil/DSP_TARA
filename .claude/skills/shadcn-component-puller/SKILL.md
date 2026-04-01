---
name: shadcn-component-puller
description: Check availability of shadcn/ui components and install them into an existing project with a deterministic workflow. Use when a user asks to add a new shadcn component, verify if a component exists in the registry, inspect a component before installing, or install components in Vite/React projects (including monorepos with explicit cwd).
---

# Shadcn Component Puller

Run a strict `verify -> inspect -> install -> verify` workflow so component addition is consistent and low-risk.

## Inputs
- Component name (required), for example `dialog`, `sheet`, `table`.
- Target project directory (optional). Default: current working directory.

## Workflow
1. Verify project setup.
- Check `components.json` exists in target directory.
- Run `npx shadcn info --json`.
- Stop if setup is invalid and report the missing prerequisite.

2. Check availability before installing.
- Run `npx shadcn view <component>`.
- If unavailable, run `npx shadcn search @shadcn -q "<component>"` and return nearest options.
- Do not run `add` when availability is not confirmed.

3. Install only after confirmation.
- Run `npx shadcn add <component> -y`.
- For monorepos, run from workspace app root or pass `-c <app_path>`.

4. Verify output.
- Confirm files added under `src/components/ui` (or alias target from `components.json`).
- Run a quick type/build check only if requested by the user.

## Command Reference
- Setup check: `npx shadcn info --json`
- Availability check: `npx shadcn view <component>`
- Search fallback: `npx shadcn search @shadcn -q "<component>"`
- Install: `npx shadcn add <component> -y`

## Script
Use `scripts/add_shadcn_component.sh` for deterministic execution.

```bash
bash /Users/abhishekgupta/.codex/skills/shadcn-component-puller/scripts/add_shadcn_component.sh <component> [project_dir]
```

## Expected Behavior
- Always check availability before install.
- Never claim installation succeeded without command output confirmation.
- If network fails, rerun with proper permission/escalation.
