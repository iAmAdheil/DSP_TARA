export interface AttackPathResponse {
  id: string;
  runId: string;
  startSurface: string;
  targetAssetId: string;
  steps: unknown[];
  feasibilityScore: number;
  impactScore: number;
  overallPathRisk: number;
  targetAsset: { id: string; name: string; kind: string };
}
