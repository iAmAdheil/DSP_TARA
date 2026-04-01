#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <component> [project_dir]" >&2
  exit 1
fi

component="$1"
project_dir="${2:-$PWD}"

if [[ ! -d "$project_dir" ]]; then
  echo "[ERROR] Project directory not found: $project_dir" >&2
  exit 1
fi

cd "$project_dir"

if [[ ! -f "components.json" ]]; then
  echo "[ERROR] Missing components.json in $project_dir" >&2
  echo "[HINT] Initialize shadcn first: npx shadcn@latest init" >&2
  exit 1
fi

echo "[1/4] Verifying shadcn setup..."
npx shadcn info --json >/tmp/shadcn-info.json

if ! grep -q '"project"' /tmp/shadcn-info.json; then
  echo "[ERROR] shadcn setup verification failed." >&2
  exit 1
fi

echo "[2/4] Checking availability for component: $component"
if ! npx shadcn view "$component" >/tmp/shadcn-view.txt 2>/tmp/shadcn-view.err; then
  echo "[ERROR] Component '$component' not found in registry." >&2
  echo "[INFO] Similar matches:" >&2
  npx shadcn search @shadcn -q "$component" || true
  exit 1
fi

echo "[3/4] Installing component: $component"
npx shadcn add "$component" -y

echo "[4/4] Verifying generated files"
if [[ -d "src/components/ui" ]]; then
  ls -1 "src/components/ui" | sed 's/^/  - /'
else
  echo "[WARN] src/components/ui directory not found. Check aliases in components.json." >&2
fi

echo "[OK] Completed component install workflow for '$component'."
