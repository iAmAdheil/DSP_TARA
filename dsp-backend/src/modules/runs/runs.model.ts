import type { StepName, StepStatus } from "../../utils/run-progress.js";

export interface RunResponse {
  id: string;
  projectId: string;
  initiatedBy: string;
  status: "queued" | "running" | "completed" | "failed";
  failedStep: string | null;
  errorMessage: string | null;
  steps: Record<StepName, StepStatus>;
  startedAt: Date;
  completedAt: Date | null;
}
