import { prisma } from "../../db/prisma-client.js";

export class RisksService {
  async getByRunId(runId: string) {
    return prisma.riskItem.findMany({
      where: { runId },
      include: {
        threat: { select: { id: true, category: true, description: true } },
        cveMatch: { select: { id: true, cveIdentifier: true, matchTier: true } },
        attackPath: { select: { id: true, startSurface: true, overallPathRisk: true } },
      },
      orderBy: { finalScore: "desc" },
    });
  }
}
