import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import { geminiStructuredCall, SchemaType } from "../utils/gemini-client.js";

// ── Graph types ─────────────────────────────────────────────────────

interface GraphNode {
  assetId: string;
  assetType: string;
  trustZone: string;
  criticalityTags: string[];
  softwareInstances: Array<{ id: string; name: string; version: string | null }>;
  cves: Array<{ id: string; cveIdentifier: string; cvssScore: number | null }>;
}

interface GraphEdge {
  targetAssetId: string;
  protocol: string;
  direction: "unidirectional" | "bidirectional";
  crossesTrustBoundary: boolean;
  dataClassification: string;
}

// ── Path types ──────────────────────────────────────────────────────

interface PathHop {
  hop: number;
  assetId: string;
  assetName: string;
  edgeProtocol: string | null;
  crossesTrustBoundary: boolean;
  cvesAtHop: string[];
}

interface CandidatePath {
  threatId: string;
  entryAssetId: string;
  targetAssetId: string;
  targetAssetName: string;
  hops: PathHop[];
  trustBoundaryCrossings: number;
  maxCvss: number;
}

// ── LLM evaluation types ────────────────────────────────────────────

interface PathEvaluation {
  pathIndex: number;
  plausible: boolean;
  feasibilityScore: number;
  reasoning: string;
}

interface EvalBatchResponse {
  evaluations: PathEvaluation[];
}

const EVAL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    evaluations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pathIndex: { type: SchemaType.NUMBER },
          plausible: { type: SchemaType.BOOLEAN },
          feasibilityScore: { type: SchemaType.NUMBER },
          reasoning: { type: SchemaType.STRING },
        },
        required: ["pathIndex", "plausible", "feasibilityScore", "reasoning"],
      },
    },
  },
  required: ["evaluations"],
};

const EVAL_SYSTEM_PROMPT = `You are a cybersecurity attack path evaluator for TARA.
Given candidate attack paths through a system, evaluate each for plausibility.

For each path:
- Determine if it is realistic given the system architecture, protocols, and trust boundaries
- Assign a feasibilityScore (0-1) where 1 = trivially exploitable and 0 = practically impossible
- Provide clear reasoning for your assessment
- Consider: protocol weaknesses, trust boundary strength, CVE exploitability at each hop, defense-in-depth

Be conservative — only mark paths as plausible if there is a credible exploit chain.`;

/**
 * Attack Path Construction worker (Step 4).
 * Builds in-memory graph, runs BFS, evaluates with Gemini.
 */
export const attackPathsWorker = new Worker(
  QueueNames.attackPaths,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "attack_paths");

      // Fetch all data for graph construction
      const [assets, interfaces, trustBoundaries, softwareInstances, cveMatches, dataFlows, threats, run] =
        await Promise.all([
          prisma.asset.findMany({ where: { runId } }),
          prisma.interface.findMany({ where: { runId } }),
          prisma.trustBoundary.findMany({ where: { runId } }),
          prisma.softwareInstance.findMany({ where: { runId } }),
          prisma.cveMatch.findMany({ where: { runId }, include: { matchedAssets: true } }),
          prisma.dataFlow.findMany({ where: { runId } }),
          prisma.threat.findMany({ where: { runId }, include: { entryPoints: true, impactedAssets: true } }),
          prisma.run.findUniqueOrThrow({
            where: { id: runId },
            include: { project: { select: { systemContext: true } } },
          }),
        ]);

      const maxHops = ((run.configSnapshot as Record<string, unknown> | null)?.maxHops as number) ?? 10;

      // ── Build adjacency graph ───────────────────────────────────────

      // Determine which assets are behind trust boundaries
      const assetTrustZone = new Map<string, string>();
      for (const tb of trustBoundaries) {
        const meta = tb.metadata as { crossingInterfaceNames?: string[] } | null;
        // Assets connected via crossing interfaces are "inside" the boundary
        for (const iface of interfaces) {
          if (meta?.crossingInterfaceNames?.includes(iface.name)) {
            const ifaceMeta = iface.metadata as { endpointAssetNames?: string[] } | null;
            for (const assetName of ifaceMeta?.endpointAssetNames ?? []) {
              const asset = assets.find((a) => a.name === assetName);
              if (asset) assetTrustZone.set(asset.id, tb.name);
            }
          }
        }
      }

      // CVEs by asset
      const cvesByAsset = new Map<string, typeof cveMatches>();
      for (const cve of cveMatches) {
        for (const ma of cve.matchedAssets) {
          const existing = cvesByAsset.get(ma.assetId) ?? [];
          existing.push(cve);
          cvesByAsset.set(ma.assetId, existing);
        }
      }

      // Software instances by asset
      const swByAsset = new Map<string, typeof softwareInstances>();
      for (const sw of softwareInstances) {
        const existing = swByAsset.get(sw.assetId) ?? [];
        existing.push(sw);
        swByAsset.set(sw.assetId, existing);
      }

      const graph = new Map<string, { node: GraphNode; edges: GraphEdge[] }>();

      for (const asset of assets) {
        const meta = asset.metadata as { subsystemTag?: string } | null;
        graph.set(asset.id, {
          node: {
            assetId: asset.id,
            assetType: asset.kind,
            trustZone: assetTrustZone.get(asset.id) ?? "default",
            criticalityTags: meta?.subsystemTag ? [meta.subsystemTag] : [],
            softwareInstances: (swByAsset.get(asset.id) ?? []).map((sw) => ({
              id: sw.id,
              name: sw.name,
              version: sw.version,
            })),
            cves: (cvesByAsset.get(asset.id) ?? []).map((c) => ({
              id: c.id,
              cveIdentifier: c.cveIdentifier,
              cvssScore: c.cvssScore,
            })),
          },
          edges: [],
        });
      }

      // Add edges from data flows
      for (const df of dataFlows) {
        const sourceEntry = graph.get(df.sourceId);
        const targetEntry = graph.get(df.targetId);
        if (!sourceEntry || !targetEntry) continue;

        const crossesBoundary = assetTrustZone.get(df.sourceId) !== assetTrustZone.get(df.targetId);

        // Forward edge
        sourceEntry.edges.push({
          targetAssetId: df.targetId,
          protocol: df.protocol ?? "unknown",
          direction: "bidirectional",
          crossesTrustBoundary: crossesBoundary,
          dataClassification: df.dataClassification ?? "unknown",
        });

        // Reverse edge (bidirectional by default)
        targetEntry.edges.push({
          targetAssetId: df.sourceId,
          protocol: df.protocol ?? "unknown",
          direction: "bidirectional",
          crossesTrustBoundary: crossesBoundary,
          dataClassification: df.dataClassification ?? "unknown",
        });
      }

      // ── BFS path enumeration ────────────────────────────────────────

      // Identify high-value targets (assets with safety functions or critical tags)
      const safetyFunctions = await prisma.safetyFunction.findMany({ where: { runId } });
      const highValueAssetIds = new Set<string>();
      for (const sf of safetyFunctions) {
        highValueAssetIds.add(sf.assetId);
      }
      // If no safety functions, all assets are potential targets
      if (highValueAssetIds.size === 0) {
        for (const asset of assets) {
          highValueAssetIds.add(asset.id);
        }
      }

      const assetNameMap = new Map(assets.map((a) => [a.id, a.name]));
      const candidatePaths: CandidatePath[] = [];

      for (const threat of threats) {
        const entryPointIds = threat.entryPoints.map((ep) => ep.assetId);

        for (const startId of entryPointIds) {
          // BFS
          const queue: Array<{ assetId: string; hops: PathHop[] }> = [{
            assetId: startId,
            hops: [{
              hop: 1,
              assetId: startId,
              assetName: assetNameMap.get(startId) ?? "unknown",
              edgeProtocol: null,
              crossesTrustBoundary: false,
              cvesAtHop: (cvesByAsset.get(startId) ?? []).map((c) => c.cveIdentifier),
            }],
          }];

          const visited = new Set<string>([startId]);

          while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.hops.length > maxHops) continue;

            const entry = graph.get(current.assetId);
            if (!entry) continue;

            for (const edge of entry.edges) {
              if (visited.has(edge.targetAssetId)) continue;
              visited.add(edge.targetAssetId);

              const newHop: PathHop = {
                hop: current.hops.length + 1,
                assetId: edge.targetAssetId,
                assetName: assetNameMap.get(edge.targetAssetId) ?? "unknown",
                edgeProtocol: edge.protocol,
                crossesTrustBoundary: edge.crossesTrustBoundary,
                cvesAtHop: (cvesByAsset.get(edge.targetAssetId) ?? []).map((c) => c.cveIdentifier),
              };
              const newHops = [...current.hops, newHop];

              // If target is high-value, record this path
              if (highValueAssetIds.has(edge.targetAssetId) && edge.targetAssetId !== startId) {
                const tbCrossings = newHops.filter((h) => h.crossesTrustBoundary).length;
                const allCvss = newHops.flatMap((h) =>
                  (cvesByAsset.get(h.assetId) ?? []).map((c) => c.cvssScore ?? 0)
                );
                candidatePaths.push({
                  threatId: threat.id,
                  entryAssetId: startId,
                  targetAssetId: edge.targetAssetId,
                  targetAssetName: assetNameMap.get(edge.targetAssetId) ?? "unknown",
                  hops: newHops,
                  trustBoundaryCrossings: tbCrossings,
                  maxCvss: allCvss.length > 0 ? Math.max(...allCvss) : 0,
                });
              }

              // Continue BFS
              if (newHops.length < maxHops) {
                queue.push({ assetId: edge.targetAssetId, hops: newHops });
              }
            }
          }
        }
      }

      // ── LLM plausibility evaluation ─────────────────────────────────

      const evaluatedPaths: Array<CandidatePath & { feasibilityScore: number; reasoning: string }> = [];

      if (candidatePaths.length > 0) {
        const systemContext = run.project.systemContext ?? "";

        // Batch paths for LLM evaluation (5 per call to keep context manageable)
        for (let i = 0; i < candidatePaths.length; i += 5) {
          const batch = candidatePaths.slice(i, i + 5);
          const pathDescriptions = batch.map((p, idx) => {
            const hopDesc = p.hops.map((h) =>
              `  Hop ${h.hop}: ${h.assetName}${h.edgeProtocol ? ` via ${h.edgeProtocol}` : ""}${h.crossesTrustBoundary ? " [CROSSES TRUST BOUNDARY]" : ""}${h.cvesAtHop.length > 0 ? ` (CVEs: ${h.cvesAtHop.join(", ")})` : ""}`
            ).join("\n");
            return `Path ${idx} (threat → ${p.targetAssetName}, ${p.trustBoundaryCrossings} boundary crossings):\n${hopDesc}`;
          }).join("\n\n");

          const userMessage = [
            systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
            `[CANDIDATE ATTACK PATHS]\n${pathDescriptions}`,
          ].filter(Boolean).join("\n\n");

          const result = await geminiStructuredCall<EvalBatchResponse>({
            systemPrompt: EVAL_SYSTEM_PROMPT,
            userMessage,
            responseSchema: EVAL_SCHEMA,
          });

          for (const evaluation of result.evaluations) {
            const path = batch[evaluation.pathIndex];
            if (!path) continue;
            if (!evaluation.plausible) continue;

            evaluatedPaths.push({
              ...path,
              feasibilityScore: Math.max(0, Math.min(1, evaluation.feasibilityScore)),
              reasoning: evaluation.reasoning,
            });
          }
        }
      }

      // ── Score and store paths ───────────────────────────────────────

      for (const path of evaluatedPaths) {
        // Impact score from target asset criticality
        const targetNode = graph.get(path.targetAssetId);
        const hasSafetyFunction = safetyFunctions.some((sf) => sf.assetId === path.targetAssetId);
        const impactScore = hasSafetyFunction ? 0.9 : 0.5;
        const overallPathRisk = path.feasibilityScore * impactScore;

        await prisma.attackPath.create({
          data: {
            runId,
            startSurface: path.entryAssetId,
            targetAssetId: path.targetAssetId,
            steps: path.hops as unknown as Prisma.InputJsonValue,
            feasibilityScore: path.feasibilityScore,
            impactScore,
            overallPathRisk,
            reasoning: path.reasoning,
            trustBoundaryCrossings: path.trustBoundaryCrossings,
            evidenceRefs: {
              threatId: path.threatId,
              cveIds: path.hops.flatMap((h) => h.cvesAtHop),
            },
          },
        });
      }

      await setStepCompleted(runId, "attack_paths");
      return { pathsBuilt: evaluatedPaths.length, candidatesEvaluated: candidatePaths.length };
    } catch (err) {
      await failRun(runId, "attack_paths", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
