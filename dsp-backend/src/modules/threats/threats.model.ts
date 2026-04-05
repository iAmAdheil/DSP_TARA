export interface ThreatResponse {
  id: string;
  runId: string;
  title: string | null;
  category: string;
  framework: string;
  description: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "extreme";
  impactBreakdown: unknown;
  evidenceRefs: unknown;
  entryPoints: Array<{ id: string; name: string; kind: string }>;
  impactedAssets: Array<{ id: string; name: string; kind: string }>;
}
