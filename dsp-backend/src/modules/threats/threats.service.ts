import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma-client.js";

type RawImpactBreakdown = {
  safetyImpact?: string | null;
  financialImpact?: string | null;
  operationalImpact?: string | null;
};

function scoreKeywords(value: string | null | undefined, map: Array<[string, number]>): number {
  if (!value) return 1;
  const v = value.toLowerCase();
  for (const [keyword, score] of map) {
    if (v.includes(keyword)) return score;
  }
  return 1;
}

function deriveSeverity(impactBreakdown: Prisma.JsonValue | null): "low" | "medium" | "high" | "extreme" {
  if (!impactBreakdown || typeof impactBreakdown !== "object" || Array.isArray(impactBreakdown)) return "low";
  const ib = impactBreakdown as RawImpactBreakdown;

  const safety = scoreKeywords(ib.safetyImpact, [
    ["catastrophic", 4], ["extreme", 4],
    ["critical", 3], ["severe", 3], ["high", 3], ["fatal", 3], ["injur", 3],
    ["marginal", 2], ["medium", 2], ["minor", 2], ["moderate", 2],
  ]);
  const financial = scoreKeywords(ib.financialImpact, [
    ["severe", 4], ["extreme", 4],
    ["significant", 3], ["high", 3], ["critical", 3], ["extensive", 3], ["recall", 3],
    ["marginal", 2], ["medium", 2], ["minor", 2], ["moderate", 2],
  ]);
  const operational = scoreKeywords(ib.operationalImpact, [
    ["complete_loss", 4], ["complete loss", 4], ["inoperable", 4], ["catastrophic", 4],
    ["loss_of_function", 3], ["loss of function", 3], ["unsafe", 3], ["critical", 3], ["high", 3],
    ["degraded", 2], ["medium", 2], ["moderate", 2], ["reduced", 2],
  ]);

  const max = Math.max(safety, financial, operational);
  if (max >= 4) return "extreme";
  if (max >= 3) return "high";
  if (max >= 2) return "medium";
  return "low";
}

export class ThreatsService {
  async getByRunId(runId: string) {
    const threats = await prisma.threat.findMany({
      where: { runId },
      include: {
        entryPoints: { include: { asset: { select: { id: true, name: true, kind: true } } } },
        impactedAssets: { include: { asset: { select: { id: true, name: true, kind: true } } } },
      },
    });

    return threats.map((t) => ({
      id: t.id,
      runId: t.runId,
      title: t.title,
      category: t.category,
      framework: t.framework,
      description: t.description,
      confidence: t.confidence,
      severity: deriveSeverity(t.impactBreakdown),
      impactBreakdown: t.impactBreakdown,
      evidenceRefs: t.evidenceRefs,
      entryPoints: t.entryPoints.map((ep) => ep.asset),
      impactedAssets: t.impactedAssets.map((ia) => ia.asset),
    }));
  }
}
