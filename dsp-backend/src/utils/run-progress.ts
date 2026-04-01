import { prisma } from "../db/prisma-client.js";

export type StepName =
  | "ingestion"
  | "threats"
  | "cves"
  | "attack_paths"
  | "risk"
  | "mitigations";

export type StepStatus = "pending" | "running" | "completed" | "failed";

const DEFAULT_STEPS: Record<StepName, StepStatus> = {
  ingestion: "pending",
  threats: "pending",
  cves: "pending",
  attack_paths: "pending",
  risk: "pending",
  mitigations: "pending",
};

export function buildDefaultSteps(): Record<StepName, StepStatus> {
  return { ...DEFAULT_STEPS };
}

export async function setStepRunning(runId: string, step: StepName) {
  const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } });
  const steps = run.steps as Record<StepName, StepStatus>;
  steps[step] = "running";
  await prisma.run.update({
    where: { id: runId },
    data: { status: "running", steps },
  });
}

export async function setStepCompleted(runId: string, step: StepName) {
  const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } });
  const steps = run.steps as Record<StepName, StepStatus>;
  steps[step] = "completed";
  await prisma.run.update({
    where: { id: runId },
    data: { steps },
  });
}

export async function failRun(runId: string, step: StepName, message: string) {
  const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } });
  const steps = run.steps as Record<StepName, StepStatus>;
  steps[step] = "failed";
  await prisma.run.update({
    where: { id: runId },
    data: {
      status: "failed",
      failedStep: step,
      errorMessage: message,
      steps,
      completedAt: new Date(),
    },
  });
}

export async function completeRun(runId: string) {
  await prisma.run.update({
    where: { id: runId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });
}
