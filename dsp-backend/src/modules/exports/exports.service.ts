import { prisma } from "../../db/prisma-client.js";
import { exportQueue } from "../../queues/run-queue.js";
import type { ReportFormat } from "@prisma/client";

export class ExportsService {
  async createExport(runId: string, format: ReportFormat) {
    // Validate run is completed
    const run = await prisma.run.findUnique({ where: { id: runId }, select: { status: true } });
    if (!run) {
      return { ok: false, error: "NOT_FOUND", message: "Run not found" } as const;
    }
    if (run.status !== "completed") {
      return { ok: false, error: "CONFLICT", message: "Run must be completed before exporting" } as const;
    }

    const report = await prisma.report.create({
      data: {
        runId,
        format,
        status: "queued",
      },
    });

    await exportQueue.add("export", { runId, reportId: report.id, format }, { jobId: report.id });

    return { ok: true, data: report } as const;
  }

  async getExportsByRunId(runId: string) {
    return prisma.report.findMany({
      where: { runId },
      orderBy: { generatedAt: "desc" },
    });
  }
}
