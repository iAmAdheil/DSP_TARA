import type { AssetDetail, DataFlow, TrustBoundary } from '../types';
import { assignKindColors, getKindShape } from './colors';

export type CyElementDef = {
  data: Record<string, unknown>;
  classes?: string;
};

export function buildGraphElements(
  assets: AssetDetail[],
  dataFlows: DataFlow[],
  trustBoundaries: TrustBoundary[],
): { elements: CyElementDef[]; kindColorMap: Map<string, string> } {
  const elements: CyElementDef[] = [];

  // Assign colors in first-seen order (guaranteed no collisions ≤ 10 kinds)
  const uniqueKinds = [...new Set(assets.map((a) => a.kind))];
  const kindColorMap = assignKindColors(uniqueKinds);

  // Build a lookup: assetId → trust boundary id
  // Only include trust boundaries that have at least one member asset
  const assetTrustMap = new Map<string, string>();
  const activeBoundaryIds = new Set<string>();

  for (const tb of trustBoundaries) {
    const memberIds: string[] = (tb.metadata as { memberAssetIds?: string[] } | null)?.memberAssetIds ?? [];
    if (!memberIds.length) continue; // Change 5: skip empty trust boundaries
    activeBoundaryIds.add(tb.id);
    for (const assetId of memberIds) {
      assetTrustMap.set(assetId, tb.id);
    }
  }

  // 1. Trust boundary compound nodes (only non-empty ones)
  for (const tb of trustBoundaries) {
    if (!activeBoundaryIds.has(tb.id)) continue;
    elements.push({
      data: { id: tb.id, label: tb.name },
      classes: 'trust-boundary',
    });
  }

  // 2. Asset nodes
  for (const asset of assets) {
    const parentId = assetTrustMap.get(asset.id);
    const nodeData: Record<string, unknown> = {
      id: asset.id,
      label: asset.name,       // name only — kind rendered via HTML label above node
      kind: asset.kind,
      name: asset.name,
      color: kindColorMap.get(asset.kind) ?? '#3b82f6',
      shape: getKindShape(asset.kind),
    };
    if (parentId) {
      nodeData.parent = parentId;
    }
    elements.push({ data: nodeData });
  }

  // 3. Edge elements — protocol and dataClassification as separate label properties
  for (const df of dataFlows) {
    elements.push({
      data: {
        id: df.id,
        source: df.sourceId,
        target: df.targetId,
        protocol: df.protocol ?? '',
        dataClassification: df.dataClassification ?? '',
      },
    });
  }

  return { elements, kindColorMap };
}
