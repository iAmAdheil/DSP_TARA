import { prisma } from "../../db/prisma-client.js";

export class CvesService {
  async getByRunId(runId: string) {
    return prisma.cveMatch.findMany({
      where: { runId },
      include: {
        matchedAssets: { include: { asset: { select: { id: true, name: true, kind: true } } } },
      },
    });
  }
}
