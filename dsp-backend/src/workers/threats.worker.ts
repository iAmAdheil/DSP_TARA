import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";

/**
 * Threat Generation worker (Step 2).
 * Runs in parallel with CVE Matching (Step 3).
 *
 * TODO (iteration 2): Replace stub with real LLM-based STRIDE/HEAVENS threat generation.
 */
export const threatsWorker = new Worker(
  QueueNames.threatsGeneration,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "threats");

      // Fetch canonical model data
      const assets = await prisma.asset.findMany({ where: { runId } });
      const interfaces = await prisma.interface.findMany({ where: { runId } });
      const trustBoundaries = await prisma.trustBoundary.findMany({ where: { runId } });

      // TODO: Real implementation will:
      // - For each trust boundary crossing / exposed interface:
      //   - Construct LLM prompt with system context + threat framework config
      //   - Call LLM (structured output / function calling)
      //   - Parse response into Threat shape
      // - Validate required fields: category, entryPoints[], impactedAssets[]
      // - Assign confidence scores

      // Stub: Create a placeholder threat per asset
      for (const asset of assets) {
        const threat = await prisma.threat.create({
          data: {
            runId,
            category: "STRIDE-Spoofing",
            description: `[Stub] Potential spoofing threat targeting ${asset.name}`,
            confidence: 0.5,
            evidenceRefs: { assetIds: [asset.id], interfaceIds: interfaces.map((i) => i.id) },
          },
        });

        // Link entry points and impacted assets
        await prisma.threatEntryPoint.create({
          data: { threatId: threat.id, assetId: asset.id },
        });
        await prisma.threatImpactedAsset.create({
          data: { threatId: threat.id, assetId: asset.id },
        });
      }

      await setStepCompleted(runId, "threats");
      return { threatsGenerated: assets.length, trustBoundariesAnalyzed: trustBoundaries.length };
    } catch (err) {
      await failRun(runId, "threats", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
