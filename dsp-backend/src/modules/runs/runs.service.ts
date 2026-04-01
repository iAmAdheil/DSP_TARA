import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma-client.js";
import { runPipelineQueue } from "../../queues/run-queue.js";
import { buildDefaultSteps } from "../../utils/run-progress.js";

export class RunsService {
  async createRun(projectId: string, initiatedBy: string, configSnapshot?: Record<string, unknown>) {
    const run = await prisma.run.create({
      data: {
        projectId,
        initiatedBy,
        status: "queued",
        steps: buildDefaultSteps() as unknown as Prisma.InputJsonValue,
        configSnapshot: (configSnapshot ?? {}) as Prisma.InputJsonValue,
      },
    });

    await runPipelineQueue.add("run-pipeline", { runId: run.id }, { jobId: run.id });

    return run;
  }

  async getRunById(runId: string) {
    return prisma.run.findUnique({
      where: { id: runId },
      include: {
        project: { select: { id: true, name: true } },
      },
    });
  }
}
