export interface MitigationResponse {
  id: string;
  runId: string;
  controlType: string;
  description: string;
  estimatedEffort: string | null;
  expectedRiskReduction: number | null;
  validationSteps: unknown[] | null;
  riskLinks: Array<{
    riskItem: { id: string; sourceType: string; severity: string; finalScore: number };
  }>;
}
