import { prisma } from "../../db/prisma-client.js";

export class AttackPathsService {
  async getByRunId(runId: string) {
    return prisma.attackPath.findMany({
      where: { runId },
      include: {
        targetAsset: { select: { id: true, name: true, kind: true } },
      },
      orderBy: { overallPathRisk: "desc" },
    });
  }
}
