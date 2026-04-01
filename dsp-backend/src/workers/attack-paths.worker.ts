import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";

/**
 * Attack Path Construction worker (Step 4).
 * Runs after Steps 2+3 both complete (BullMQ Flow parent/child gate).
 *
 * TODO (iteration 2): Replace stub with real graph traversal (BFS/DFS) over canonical model.
 */
export const attackPathsWorker = new Worker(
  QueueNames.attackPaths,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "attack_paths");

      const threats = await prisma.threat.findMany({
        where: { runId },
        include: { entryPoints: true, impactedAssets: true },
      });
      const cves = await prisma.cveMatch.findMany({
        where: { runId },
        include: { matchedAssets: true },
      });
      const assets = await prisma.asset.findMany({ where: { runId } });

      // TODO: Real implementation will:
      // - Build adjacency representation of canonical graph
      // - For each threat + associated CVEs:
      //   - Identify entry points, run BFS/DFS toward high-value targets
      //   - Consider trust boundary crossings, CVE exploitability, data flow directions
      //   - Prune paths exceeding max-hop threshold
      // - Compute feasibilityScore, impactScore, overallPathRisk

      // Stub: Create one attack path per threat
      for (const threat of threats) {
        const targetAsset = assets[0]; // placeholder target
        if (!targetAsset) continue;

        await prisma.attackPath.create({
          data: {
            runId,
            startSurface: threat.entryPoints[0]?.assetId ?? "unknown",
            targetAssetId: targetAsset.id,
            steps: [
              { hop: 1, assetId: threat.entryPoints[0]?.assetId, action: "Initial access via " + threat.category },
              { hop: 2, assetId: targetAsset.id, action: "Lateral movement to target" },
            ],
            feasibilityScore: 0.5,
            impactScore: 0.7,
            overallPathRisk: 0.35,
          },
        });
      }

      await setStepCompleted(runId, "attack_paths");
      return { pathsBuilt: threats.length, cvesConsidered: cves.length };
    } catch (err) {
      await failRun(runId, "attack_paths", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
