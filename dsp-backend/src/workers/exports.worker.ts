import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";

/**
 * Export worker (Step 7 — manual trigger, NOT part of auto pipeline).
 * Generates a downloadable report in the requested format.
 *
 * TODO (iteration 2):
 * - JSON: serialize all artifacts into structured RunExport shape
 * - MD: render Markdown report with sections per artifact type
 * - PDF: render HTML template → headless Chromium / PDF lib
 * - Upload to S3/MinIO and set downloadUrl
 */
export const exportsWorker = new Worker(
  QueueNames.exportGeneration,
  async (job) => {
    const { runId, reportId, format } = job.data as {
      runId: string;
      reportId: string;
      format: string;
    };

    try {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "running" },
      });

      // Fetch all run artifacts for export
      const [threats, cves, attackPaths, riskItems, mitigations] = await Promise.all([
        prisma.threat.findMany({ where: { runId } }),
        prisma.cveMatch.findMany({ where: { runId } }),
        prisma.attackPath.findMany({ where: { runId } }),
        prisma.riskItem.findMany({ where: { runId }, orderBy: { finalScore: "desc" } }),
        prisma.mitigation.findMany({ where: { runId } }),
      ]);

      // TODO: Real format-specific generation
      // For now, stub: generate a JSON summary regardless of format
      const exportData = {
        runId,
        format,
        generatedAt: new Date().toISOString(),
        summary: {
          threats: threats.length,
          cves: cves.length,
          attackPaths: attackPaths.length,
          riskItems: riskItems.length,
          mitigations: mitigations.length,
        },
        // TODO: Full artifact serialization, Markdown rendering, PDF generation
      };

      // TODO: Upload to S3/MinIO. For now, store inline as a stub URL.
      const stubDownloadUrl = `data:application/${format};base64,${Buffer.from(JSON.stringify(exportData, null, 2)).toString("base64")}`;

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "completed",
          downloadUrl: stubDownloadUrl,
          generatedAt: new Date(),
        },
      });

      return { reportId, format };
    } catch (err) {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
