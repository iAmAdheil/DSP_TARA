import { prisma } from "../../db/prisma-client.js";

export class AssetsService {
  async getAssetsByRunId(runId: string) {
    const [assets, interfaces, dataFlows, trustBoundaries, softwareInstances, safetyFunctions] =
      await Promise.all([
        prisma.asset.findMany({
          where: { runId },
          select: {
            id: true,
            runId: true,
            name: true,
            kind: true,
            metadata: true,
            softwareInstances: {
              select: { id: true, assetId: true, name: true, version: true, cpe: true },
            },
            safetyFunctions: {
              select: { id: true, assetId: true, name: true, asilLevel: true },
            },
          },
        }),
        prisma.interface.findMany({
          where: { runId },
          select: { id: true, runId: true, name: true, protocol: true },
        }),
        prisma.dataFlow.findMany({
          where: { runId },
          select: {
            id: true,
            runId: true,
            sourceId: true,
            targetId: true,
            protocol: true,
            dataClassification: true,
          },
        }),
        prisma.trustBoundary.findMany({
          where: { runId },
          select: { id: true, runId: true, name: true, metadata: true },
        }),
        prisma.softwareInstance.findMany({
          where: { runId },
          select: { id: true, assetId: true, name: true, version: true, cpe: true },
        }),
        prisma.safetyFunction.findMany({
          where: { runId },
          select: { id: true, assetId: true, name: true, asilLevel: true },
        }),
      ]);

    return { assets, interfaces, dataFlows, trustBoundaries, softwareInstances, safetyFunctions };
  }
}
