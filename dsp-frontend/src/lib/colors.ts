// Single source of truth for all color values consumed in JS contexts.
// Hex values match the CSS tokens defined in TARA-Theme-System-Spec.md §12.

export const CATEGORICAL_PALETTE: string[] = [
  '#3b82f6', // --cat-1  blue
  '#22c55e', // --cat-2  green
  '#f97316', // --cat-3  orange
  '#a855f7', // --cat-4  purple
  '#0ea5e9', // --cat-5  sky
  '#ef4444', // --cat-6  red
  '#eab308', // --cat-7  amber
  '#14b8a6', // --cat-8  teal
  '#ec4899', // --cat-9  pink
  '#84cc16', // --cat-10 lime
];

/**
 * Assigns palette colors to kinds in first-seen order.
 * Guarantees zero collisions for up to 10 distinct kinds.
 */
export function assignKindColors(kinds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const kind of kinds) {
    if (!map.has(kind)) {
      map.set(kind, CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length]);
      idx++;
    }
  }
  return map;
}

export function getKindShape(kind: string): string {
  const lower = kind.toLowerCase();
  if (lower.includes('sensor'))   return 'ellipse';
  if (lower.includes('gateway'))  return 'diamond';
  if (lower.includes('actuator')) return 'hexagon';
  return 'roundrectangle';
}

export const colors = {
  edgeProtocol:       '#0ea5e9', // --cat-5 sky  — protocol edge labels
  edgeClassification: '#eab308', // --cat-7 amber — data classification labels
  edgeLine:           '#cfd6de', // --border-strong — edge lines
  borderDefault:      '#dfe3e8', // --border-default
  borderFocus:        '#24a06b', // --border-focus
  surfaceSubtle:      '#f9fafb', // --bg-surface-1
} as const;
