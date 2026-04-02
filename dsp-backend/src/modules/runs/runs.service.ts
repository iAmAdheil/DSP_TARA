import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma-client.js";
import { runPipelineQueue } from "../../queues/run-queue.js";
import { buildDefaultSteps } from "../../utils/run-progress.js";

interface ArtifactInput {
  type: "text";
  content: string;
}

export class RunsService {
  async createRun(
    projectId: string,
    initiatedBy: string,
    artifacts: ArtifactInput[],
    configSnapshot?: Record<string, unknown>,
  ) {
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.run.create({
        data: {
          projectId,
          initiatedBy,
          status: "queued",
          steps: buildDefaultSteps() as unknown as Prisma.InputJsonValue,
          configSnapshot: (configSnapshot ?? {}) as Prisma.InputJsonValue,
        },
      });

      await tx.inputArtifact.createMany({
        data: artifacts.map((a) => ({
          runId: created.id,
          type: a.type,
          content: a.content,
        })),
      });

      return created;
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
