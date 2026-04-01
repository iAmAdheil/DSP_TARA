import { prisma } from "../../db/prisma-client.js";

export class ThreatsService {
  async getByRunId(runId: string) {
    return prisma.threat.findMany({
      where: { runId },
      include: {
        entryPoints: { include: { asset: { select: { id: true, name: true, kind: true } } } },
        impactedAssets: { include: { asset: { select: { id: true, name: true, kind: true } } } },
      },
    });
  }
}
