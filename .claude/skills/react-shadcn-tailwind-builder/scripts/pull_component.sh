#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <component> [project_dir]" >&2
  exit 1
fi

component="$1"
project_dir="${2:-$PWD}"

cd "$project_dir"

if [[ ! -f "components.json" ]]; then
  echo "[ERROR] components.json missing in $project_dir" >&2
  exit 1
fi

echo "[1/3] Setup check"
npx shadcn info --json >/dev/null

echo "[2/3] Registry check for $component"
npx shadcn view "$component" >/dev/null

echo "[3/3] Install $component"
npx shadcn add "$component" -y

echo "[OK] Component '$component' installed or already present."
