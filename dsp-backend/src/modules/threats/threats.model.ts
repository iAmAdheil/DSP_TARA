export interface ThreatResponse {
  id: string;
  runId: string;
  category: string;
  description: string;
  confidence: number;
  entryPoints: Array<{ assetId: string; asset: { id: string; name: string; kind: string } }>;
  impactedAssets: Array<{ assetId: string; asset: { id: string; name: string; kind: string } }>;
}
