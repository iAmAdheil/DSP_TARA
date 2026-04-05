import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import type { Prisma, RiskSeverity } from "@prisma/client";

// Fixed weights per decision doc
const WEIGHTS = {
  likelihood: 0.3,
  impact: 0.3,
  exploitability: 0.25,
  exposureModifier: 0.15,
} as const;

function scoreToBucket(score: number): RiskSeverity {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function buildBreakdown(
  likelihood: number,
  impact: number,
  exploitability: number,
  exposureModifier: number,
  finalScore: number,
  sources: Record<string, string>,
) {
  return {
    factors: [
      { name: "likelihood", value: likelihood, weight: WEIGHTS.likelihood, contribution: likelihood * WEIGHTS.likelihood, source: sources.likelihood },
      { name: "impact", value: impact, weight: WEIGHTS.impact, contribution: impact * WEIGHTS.impact, source: sources.impact },
      { name: "exploitability", value: exploitability, weight: WEIGHTS.exploitability, contribution: exploitability * WEIGHTS.exploitability, source: sources.exploitability },
      { name: "exposureModifier", value: exposureModifier, weight: WEIGHTS.exposureModifier, contribution: exposureModifier * WEIGHTS.exposureModifier, source: sources.exposureModifier },
    ],
    finalScore,
    formula: "0.3×likelihood + 0.3×impact + 0.25×exploitability + 0.15×exposureModifier",
  };
}

/**
 * Risk Scoring worker (Step 5).
 * Fixed 4-factor formula. Every threat, CVE, and attack path becomes its own RiskItem.
 */
export const riskWorker = new Worker(
  QueueNames.riskScoring,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "risk");

      const [threats, cveMatches, attackPaths, safetyFunctions, assets] = await Promise.all([
        prisma.threat.findMany({
          where: { runId },
          include: { impactedAssets: { include: { asset: true } }, entryPoints: { include: { asset: true } } },
        }),
        prisma.cveMatch.findMany({
          where: { runId },
          include: { matchedSoftwareInstance: { include: { asset: true } } },
        }),
        prisma.attackPath.findMany({
          where: { runId },
          include: { targetAsset: true },
        }),
        prisma.safetyFunction.findMany({ where: { runId } }),
        prisma.asset.findMany({ where: { runId } }),
      ]);

      // Asset criticality lookup: safety-critical=0.9, normal=0.5, low=0.2
      const safetyAssetIds = new Set(safetyFunctions.map((sf) => sf.assetId));
      function assetCriticality(assetId: string): number {
        if (safetyAssetIds.has(assetId)) return 0.9;
        return 0.5;
      }

      // Check if asset is internet-facing (heuristic: metadata or kind contains network-related terms)
      function isInternetFacing(assetId: string): boolean {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) return false;
        const kind = asset.kind.toLowerCase();
        return kind.includes("gateway") || kind.includes("cloud") || kind.includes("server") || kind.includes("api");
      }

      let totalScored = 0;

      // ── Score threats ─────────────────────────────────────────────

      function operationalImpactToExploitability(op: string | undefined): number {
        switch (op) {
          case "complete_loss":    return 0.9;
          case "loss_of_function": return 0.7;
          case "degraded":         return 0.5;
          case "negligible":       return 0.2;
          default:                 return 0.5; // fallback for any legacy free-text values
        }
      }

      for (const threat of threats) {
        const likelihood = threat.confidence;

        // Impact: max criticality across impacted assets
        const impactScores = threat.impactedAssets.map((ia) => assetCriticality(ia.assetId));
        const impact = impactScores.length > 0 ? Math.max(...impactScores) : 0.5;

        const impactBreakdown = threat.impactBreakdown as { operationalImpact?: string } | null;
        const exploitability = operationalImpactToExploitability(impactBreakdown?.operationalImpact);

        // Exposure: 1.0 if entry point is internet-facing, subtract 0.2 per trust boundary
        const entryFacing = threat.entryPoints.some((ep) => isInternetFacing(ep.assetId));
        const exposureModifier = Math.max(0.2, entryFacing ? 1.0 : 0.6);

        const finalScore =
          WEIGHTS.likelihood * likelihood +
          WEIGHTS.impact * impact +
          WEIGHTS.exploitability * exploitability +
          WEIGHTS.exposureModifier * exposureModifier;

        const breakdown = buildBreakdown(likelihood, impact, exploitability, exposureModifier, finalScore, {
          likelihood: "threat.confidence",
          impact: "max criticality of impacted assets",
          exploitability: `operationalImpact=${impactBreakdown?.operationalImpact ?? "unknown"}`,
          exposureModifier: entryFacing ? "entry point internet-facing" : "entry point internal",
        });

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
            factorBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          },
        });
        totalScored++;
      }

      // ── Score CVEs ────────────────────────────────────────────────

      for (const cve of cveMatches) {
        const likelihood = 0.8; // known vulnerability — high baseline

        // Impact: parent asset criticality
        const parentAssetId = cve.matchedSoftwareInstance?.asset?.id;
        const impact = parentAssetId ? assetCriticality(parentAssetId) : 0.5;

        // Exploitability from CVSS
        const exploitability = cve.cvssScore ? cve.cvssScore / 10 : 0.5;

        // Exposure: check if parent asset is internet-facing
        const assetFacing = parentAssetId ? isInternetFacing(parentAssetId) : false;
        const exposureModifier = assetFacing ? 1.0 : 0.6;

        const finalScore =
          WEIGHTS.likelihood * likelihood +
          WEIGHTS.impact * impact +
          WEIGHTS.exploitability * exploitability +
          WEIGHTS.exposureModifier * exposureModifier;

        const breakdown = buildBreakdown(likelihood, impact, exploitability, exposureModifier, finalScore, {
          likelihood: "known CVE baseline (0.8)",
          impact: "parent asset criticality",
          exploitability: cve.cvssScore ? `CVSS ${cve.cvssScore}/10` : "default (0.5)",
          exposureModifier: assetFacing ? "asset internet-facing" : "asset behind trust boundary",
        });

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
            factorBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          },
        });
        totalScored++;
      }

      // ── Score attack paths ────────────────────────────────────────

      for (const path of attackPaths) {
        const likelihood = path.feasibilityScore;

        // Impact: target asset criticality
        const impact = assetCriticality(path.targetAssetId);

        // Exploitability: max CVSS across CVEs along the path
        const pathSteps = path.steps as Array<{ cvesAtHop?: string[] }>;
        const pathCveIds = pathSteps.flatMap((s) => s.cvesAtHop ?? []);
        const pathCves = cveMatches.filter((c) => pathCveIds.includes(c.cveIdentifier));
        const maxCvss = pathCves.length > 0
          ? Math.max(...pathCves.map((c) => c.cvssScore ?? 0))
          : 0;
        const exploitability = maxCvss > 0 ? maxCvss / 10 : 0.3;

        // Exposure: 1.0 minus 0.1 per trust boundary crossed (min 0.2)
        const exposureModifier = Math.max(0.2, 1.0 - 0.1 * path.trustBoundaryCrossings);

        const finalScore =
          WEIGHTS.likelihood * likelihood +
          WEIGHTS.impact * impact +
          WEIGHTS.exploitability * exploitability +
          WEIGHTS.exposureModifier * exposureModifier;

        const breakdown = buildBreakdown(likelihood, impact, exploitability, exposureModifier, finalScore, {
          likelihood: "path feasibilityScore from LLM",
          impact: "target asset criticality",
          exploitability: maxCvss > 0 ? `max CVSS ${maxCvss}/10 across path` : "default (0.3)",
          exposureModifier: `1.0 - 0.1×${path.trustBoundaryCrossings} boundary crossings`,
        });

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
            factorBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          },
        });
        totalScored++;
      }

      await setStepCompleted(runId, "risk");
      return { risksScored: totalScored };
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
