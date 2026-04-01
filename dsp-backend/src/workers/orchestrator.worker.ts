import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { flowProducer } from "../queues/run-queue.js";
import { prisma } from "../db/prisma-client.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import { IngestionService } from "../modules/ingestion/ingestion.service.js";

const ingestionService = new IngestionService();

/**
 * Orchestrator worker:
 * 1. Runs ingestion inline (step 1)
 * 2. Uses FlowProducer to enqueue steps 2–6 as a dependency tree
 *    - Steps 2 (threats) + 3 (cves) run in parallel as children of step 4
 *    - Steps 4→5→6 are sequential via parent/child nesting
 *
 * Per bullmq-notes.md: step 1 runs BEFORE flow.add() because BullMQ
 * doesn't support a single job being a child of two parents.
 */
export const orchestratorWorker = new Worker(
  QueueNames.runPipeline,
  async (job) => {
    const { runId } = job.data as { runId: string };

    // Mark run as running
    await prisma.run.update({ where: { id: runId }, data: { status: "running" } });

    // ── Step 1: Ingestion (inline) ──────────────────────────────────
    try {
      await setStepRunning(runId, "ingestion");
      await ingestionService.ingest(runId);
      await setStepCompleted(runId, "ingestion");
    } catch (err) {
      await failRun(runId, "ingestion", err instanceof Error ? err.message : String(err));
      throw err;
    }

    // ── Steps 2–6: Enqueue as BullMQ Flow ───────────────────────────
    // Tree is declared root-first (last step at top).
    // Execution order is bottom-up: children run first, parent runs after all children complete.
    //
    // mitigations (step 6) — root, runs last
    //   └─ risk-scoring (step 5)
    //       └─ attack-paths (step 4) — waits for BOTH children
    //           ├─ threats (step 2)
    //           └─ cves (step 3)
    await flowProducer.add({
      name: "mitigations",
      queueName: QueueNames.mitigations,
      data: { runId },
      children: [
        {
          name: "risk-scoring",
          queueName: QueueNames.riskScoring,
          data: { runId },
          children: [
            {
              name: "attack-paths",
              queueName: QueueNames.attackPaths,
              data: { runId },
              children: [
                {
                  name: "threats",
                  queueName: QueueNames.threatsGeneration,
                  data: { runId },
                },
                {
                  name: "cves",
                  queueName: QueueNames.cveMatching,
                  data: { runId },
                },
              ],
            },
          ],
        },
      ],
    });
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);
