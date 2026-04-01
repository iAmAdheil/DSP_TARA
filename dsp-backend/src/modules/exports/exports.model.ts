export interface ReportResponse {
  id: string;
  runId: string;
  format: string;
  status: string;
  errorMessage: string | null;
  generatedAt: Date;
  downloadUrl: string | null;
}
