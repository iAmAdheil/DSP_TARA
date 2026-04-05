import { prisma } from "../../db/prisma-client.js";

export class AttackPathsService {
  async getByRunId(runId: string) {
    const paths = await prisma.attackPath.findMany({
      where: { runId },
      include: {
        targetAsset: { select: { id: true, name: true, kind: true } },
      },
      orderBy: { overallPathRisk: "desc" },
    });

    const startAssetIds = [...new Set(paths.map((p) => p.startSurface))];
    const startAssets = await prisma.asset.findMany({
      where: { id: { in: startAssetIds } },
      select: { id: true, name: true, kind: true },
    });
    const startAssetMap = new Map(startAssets.map((a) => [a.id, a]));

    return paths.map((p) => ({
      ...p,
      startAsset: startAssetMap.get(p.startSurface) ?? null,
    }));
  }
}
