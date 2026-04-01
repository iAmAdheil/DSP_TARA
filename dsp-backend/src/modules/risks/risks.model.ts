export interface RiskItemResponse {
  id: string;
  runId: string;
  sourceType: string;
  likelihood: number;
  impact: number;
  exploitability: number;
  exposureModifier: number;
  finalScore: number;
  severity: string;
  threat: { id: string; category: string; description: string } | null;
  cveMatch: { id: string; cveIdentifier: string; matchTier: string } | null;
  attackPath: { id: string; startSurface: string; overallPathRisk: number } | null;
}
