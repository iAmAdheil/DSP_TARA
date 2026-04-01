import { prisma } from "../../db/prisma-client.js";

export class MitigationsService {
  async getByRunId(runId: string) {
    return prisma.mitigation.findMany({
      where: { runId },
      include: {
        riskLinks: {
          include: {
            riskItem: {
              select: { id: true, sourceType: true, severity: true, finalScore: true },
            },
          },
        },
      },
    });
  }
}
