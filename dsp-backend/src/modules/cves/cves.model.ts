export interface CveMatchResponse {
  id: string;
  runId: string;
  cveIdentifier: string;
  matchTier: string;
  matchScore: number;
  whyRelevant: string | null;
  publishedDate: Date | null;
  matchedAssets: Array<{ assetId: string; asset: { id: string; name: string; kind: string } }>;
}
