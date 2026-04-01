import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun, completeRun } from "../utils/run-progress.js";

/**
 * Mitigation Recommendation worker (Step 6 — final pipeline step).
 * After completing, marks the entire run as "completed".
 *
 * TODO (iteration 2): Replace stub with LLM-based mitigation generation + control catalog lookup.
 */
export const mitigationsWorker = new Worker(
  QueueNames.mitigations,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "mitigations");

      const riskItems = await prisma.riskItem.findMany({
        where: { runId },
        orderBy: { finalScore: "desc" },
      });

      // TODO: Real implementation will:
      // - Optionally filter to top-N risk items
      // - For each: identify control types, query control catalog, use LLM to generate
      //   context-specific mitigations with controlType, estimatedEffort, expectedRiskReduction, validationSteps
      // - A single mitigation may cover multiple risks

      // Stub: Create one mitigation per risk item
      for (const risk of riskItems) {
        const mitigation = await prisma.mitigation.create({
          data: {
            runId,
            controlType: "technical",
            description: `[Stub] Mitigation for ${risk.sourceType} risk (severity: ${risk.severity})`,
            estimatedEffort: "medium",
            expectedRiskReduction: 0.5,
            validationSteps: [
              "Review control implementation",
              "Run integration test",
              "Verify in staging environment",
            ],
          },
        });

        await prisma.mitigationRisk.create({
          data: { mitigationId: mitigation.id, riskItemId: risk.id },
        });
      }

      await setStepCompleted(runId, "mitigations");

      // This is the final pipeline step — mark the run as completed
      await completeRun(runId);

      return { mitigationsGenerated: riskItems.length };
    } catch (err) {
      await failRun(runId, "mitigations", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
