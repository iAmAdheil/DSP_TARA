import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";

/**
 * CVE Matching worker (Step 3).
 * Runs in parallel with Threat Generation (Step 2).
 *
 * TODO (iteration 2): Replace stub with real CPE derivation + NVD API + pgvector embedding search.
 */
export const cvesWorker = new Worker(
  QueueNames.cveMatching,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "cves");

      const softwareInstances = await prisma.softwareInstance.findMany({
        where: { runId },
        include: { asset: { select: { id: true } } },
      });

      // TODO: Real implementation will:
      // - For each software instance:
      //   - Derive CPE string → query NVD API (exact + near tier)
      //   - Embed description → pgvector cosine similarity (contextual tier)
      //   - Merge, deduplicate, filter by threshold
      // - Enrich with whyRelevant, publishedDate

      // Stub: Create a placeholder CVE match per software instance
      for (const sw of softwareInstances) {
        const cve = await prisma.cveMatch.create({
          data: {
            runId,
            cveIdentifier: `CVE-2024-STUB-${sw.id.slice(-4)}`,
            matchTier: "contextual",
            matchScore: 0.6,
            whyRelevant: `[Stub] Potential vulnerability in ${sw.name} ${sw.version ?? "unknown version"}`,
            publishedDate: new Date("2024-01-15"),
          },
        });

        await prisma.cveMatchAsset.create({
          data: { cveMatchId: cve.id, assetId: sw.asset.id },
        });
      }

      await setStepCompleted(runId, "cves");
      return { cvesMatched: softwareInstances.length };
    } catch (err) {
      await failRun(runId, "cves", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
