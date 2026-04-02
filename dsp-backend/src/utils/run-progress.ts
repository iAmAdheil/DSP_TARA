import { Prisma } from "@prisma/client";
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
  const path = `{${step}}`;
  await prisma.$executeRaw`
    UPDATE "runs"
    SET steps = jsonb_set(steps, ${path}::text[], ${`"running"`}::jsonb),
        status = 'running'
    WHERE id = ${runId}
  `;
}

export async function setStepCompleted(runId: string, step: StepName) {
  const path = `{${step}}`;
  await prisma.$executeRaw`
    UPDATE "runs"
    SET steps = jsonb_set(steps, ${path}::text[], ${`"completed"`}::jsonb)
    WHERE id = ${runId}
  `;
}

export async function failRun(runId: string, step: StepName, message: string) {
  const path = `{${step}}`;
  await prisma.$executeRaw`
    UPDATE "runs"
    SET steps = jsonb_set(steps, ${path}::text[], ${`"failed"`}::jsonb),
        status = 'failed',
        failed_step = ${step},
        error_message = ${message},
        completed_at = NOW()
    WHERE id = ${runId}
  `;
}

export async function completeRun(runId: string) {
  await prisma.$executeRaw`
    UPDATE "runs"
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = ${runId}
  `;
}
