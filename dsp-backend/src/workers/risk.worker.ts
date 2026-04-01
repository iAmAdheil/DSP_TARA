import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import type { RiskSeverity } from "@prisma/client";

function scoreToBucket(score: number): RiskSeverity {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.2) return "low";
  return "info";
}

/**
 * Risk Scoring worker (Step 5).
 * Produces a unified, ranked risk register from threats, CVEs, and attack paths.
 *
 * TODO (iteration 2): Replace stub scoring with configurable weight formula from Run.config_snapshot.
 */
export const riskWorker = new Worker(
  QueueNames.riskScoring,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "risk");

      const threats = await prisma.threat.findMany({ where: { runId } });
      const cves = await prisma.cveMatch.findMany({ where: { runId } });
      const attackPaths = await prisma.attackPath.findMany({ where: { runId } });

      // TODO: Real implementation will:
      // - Read scoring profile weights from Run.config_snapshot
      // - Compute likelihood, impact, exploitability, exposureModifier per source
      // - Apply weighted_sum formula
      // - Store explainability breakdown as JSON

      // Score threats
      for (const threat of threats) {
        const likelihood = threat.confidence;
        const impact = 0.6;
        const exploitability = 0.5;
        const exposureModifier = 1.0;
        const finalScore = (likelihood * 0.3 + impact * 0.3 + exploitability * 0.2 + exposureModifier * 0.2);

        await prisma.riskItem.create({
          data: {
            runId,
            sourceType: "threat",
            threatId: threat.id,
            likelihood,
            impact,
            exploitability,
            exposureModifier,
            finalScore,
            severity: scoreToBucket(finalScore),
          },
        });
      }

      // Score CVEs
      for (const cve of cves) {
        const likelihood = cve.matchScore;
        const impact = 0.7;
        const exploitability = 0.8;
        const exposureModifier = 1.0;
        const finalScore = (likelihood * 0.3 + impact * 0.3 + exploitability * 0.2 + exposureModifier * 0.2);

        await prisma.riskItem.create({
          data: {
            runId,
            sourceType: "cve",
            cveMatchId: cve.id,
            likelihood,
            impact,
            exploitability,
            exposureModifier,
            finalScore,
            severity: scoreToBucket(finalScore),
          },
        });
      }

      // Score attack paths
      for (const path of attackPaths) {
        const likelihood = path.feasibilityScore;
        const impact = path.impactScore;
        const exploitability = 0.6;
        const exposureModifier = 1.0;
        const finalScore = (likelihood * 0.3 + impact * 0.3 + exploitability * 0.2 + exposureModifier * 0.2);

        await prisma.riskItem.create({
          data: {
            runId,
            sourceType: "attack_path",
            attackPathId: path.id,
            likelihood,
            impact,
            exploitability,
            exposureModifier,
            finalScore,
            severity: scoreToBucket(finalScore),
          },
        });
      }

      await setStepCompleted(runId, "risk");
      return { risksScored: threats.length + cves.length + attackPaths.length };
    } catch (err) {
      await failRun(runId, "risk", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
