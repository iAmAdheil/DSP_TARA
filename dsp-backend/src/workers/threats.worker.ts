import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { Prisma } from "@prisma/client";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import { geminiStructuredCall, SchemaType } from "../utils/gemini-client.js";

interface ImpactBreakdown {
  safetyImpact: "negligible" | "marginal" | "critical" | "catastrophic";
  financialImpact: "negligible" | "marginal" | "significant" | "severe";
  operationalImpact: "negligible" | "degraded" | "loss_of_function" | "complete_loss";
}

interface LLMThreat {
  crossingId: string;
  category: string;
  framework: "stride" | "heavens";
  title: string;
  description: string;
  entryPoints: string[];
  impactedAssets: string[];
  confidence: number;
  evidenceRefs: string[];
  impactBreakdown: ImpactBreakdown;
}

interface ThreatBatchResponse {
  threats: LLMThreat[];
}

const IMPACT_BREAKDOWN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    safetyImpact: { type: SchemaType.STRING },
    financialImpact: { type: SchemaType.STRING },
    operationalImpact: { type: SchemaType.STRING },
  },
  required: ["safetyImpact", "financialImpact", "operationalImpact"],
};

const THREAT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    threats: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          crossingId: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          framework: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          entryPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          impactedAssets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          confidence: { type: SchemaType.NUMBER },
          evidenceRefs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          impactBreakdown: IMPACT_BREAKDOWN_SCHEMA,
        },
        required: [
          "crossingId",
          "category",
          "framework",
          "title",
          "description",
          "entryPoints",
          "impactedAssets",
          "confidence",
          "evidenceRefs",
          "impactBreakdown",
        ],
      },
    },
  },
  required: ["threats"],
};

const STRIDE_SYSTEM_PROMPT = `You are a TARA threat analysis engine using the STRIDE framework.

STRIDE categories:
- Spoofing: Impersonating something or someone else
- Tampering: Modifying data or code without authorization
- Repudiation: Claiming to have not performed an action
- Information Disclosure: Exposing information to unauthorized parties
- Denial of Service: Making a system unavailable
- Elevation of Privilege: Gaining capabilities without proper authorization

For each trust boundary crossing provided, generate specific, actionable threats.
Each threat must reference concrete assets and interfaces from the system model.
Assign a confidence score (0-1) based on how likely the threat is given the system architecture.
Set framework to "stride" for all threats.`;

const HEAVENS_SYSTEM_PROMPT = `You are a TARA threat analysis engine using the HEAVENS framework for automotive systems.

HEAVENS threat categories focus on automotive-specific concerns:
- Safety impact on vehicle occupants and road users
- Financial damage to OEM or vehicle owner
- Operational disruption of vehicle functions
- Privacy breach of driver/passenger data

Only generate HEAVENS threats if the system is clearly automotive-related (vehicles, ECUs, CAN bus, V2X, OBD, ADAS, etc.).
If the system is NOT automotive, return an empty threats array.
Set framework to "heavens" for all threats.
Assign confidence scores (0-1) reflecting automotive-specific risk assessment.`;

/** Resolve asset names through the map, logging any misses. */
function resolveAssetNames(
  names: string[],
  assetNameToId: Map<string, string>,
  context: { threatId: string; field: string },
): string[] {
  const resolved: string[] = [];
  for (const name of names) {
    const id = assetNameToId.get(name);
    if (id) {
      resolved.push(id);
    } else {
      console.warn(
        `[threats] "${context.field}" name not found in asset map — skipping. threatId=${context.threatId}, name="${name}"`,
      );
    }
  }
  return resolved;
}

/**
 * Threat Generation worker (Step 2).
 * STRIDE + conditional HEAVENS via Gemini, batching 3 crossings per call.
 */
export const threatsWorker = new Worker(
  QueueNames.threatsGeneration,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "threats");

      const assets = await prisma.asset.findMany({ where: { runId } });
      const interfaces = await prisma.interface.findMany({ where: { runId } });
      const trustBoundaries = await prisma.trustBoundary.findMany({ where: { runId } });
      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: { project: { select: { systemContext: true } } },
      });

      // Build asset name→id map
      const assetNameToId = new Map(assets.map((a) => [a.name, a.id]));

      // Exact asset name list for the LLM prompt — the LLM MUST use these verbatim
      const exactAssetNameList = assets.map((a) => a.name).join(", ");
      const assetNameInstruction = `\nThe following are the EXACT asset names in this system. When specifying entryPoints, impactedAssets, or evidenceRefs, you MUST use names from this list verbatim — do not paraphrase, abbreviate, or rephrase:\n${exactAssetNameList}`;

      // Build crossing descriptions from trust boundaries + interfaces
      const crossings: Array<{ id: string; description: string }> = [];
      for (const tb of trustBoundaries) {
        const meta = tb.metadata as { crossingInterfaceNames?: string[] } | null;
        const crossingInterfaces = meta?.crossingInterfaceNames ?? [];
        for (const ifaceName of crossingInterfaces) {
          const iface = interfaces.find((i) => i.name === ifaceName);
          crossings.push({
            id: `${tb.id}:${ifaceName}`,
            description: `Trust boundary "${tb.name}" crossed by interface "${ifaceName}" (protocol: ${iface?.protocol ?? "unknown"})`,
          });
        }
        // If no crossing interfaces, still create a crossing for the boundary itself
        if (crossingInterfaces.length === 0) {
          crossings.push({
            id: tb.id,
            description: `Trust boundary "${tb.name}"`,
          });
        }
      }

      // If no trust boundaries, create crossings from interfaces as fallback
      if (crossings.length === 0) {
        for (const iface of interfaces) {
          crossings.push({
            id: iface.id,
            description: `Interface "${iface.name}" (protocol: ${iface.protocol ?? "unknown"})`,
          });
        }
      }

      // If still no crossings, use assets as entry points
      if (crossings.length === 0) {
        for (const asset of assets) {
          crossings.push({
            id: asset.id,
            description: `Asset "${asset.name}" (type: ${asset.kind})`,
          });
        }
      }

      const systemContext = run.project.systemContext ?? "";
      const canonicalContext = [
        `Assets: ${assets.map((a) => `${a.name} (${a.kind})`).join(", ")}`,
        `Interfaces: ${interfaces.map((i) => `${i.name} (${i.protocol})`).join(", ")}`,
        `Trust Boundaries: ${trustBoundaries.map((t) => t.name).join(", ")}`,
      ].join("\n");

      let totalThreats = 0;

      // Helper to persist a batch of LLM threats
      async function persistThreats(threats: LLMThreat[], framework: "stride" | "heavens") {
        for (const t of threats) {
          const threat = await prisma.threat.create({
            data: {
              runId,
              title: t.title,
              category: t.category,
              framework,
              description: t.description,
              confidence: Math.max(0, Math.min(1, t.confidence)),
              impactBreakdown: t.impactBreakdown as unknown as Prisma.InputJsonValue,
              evidenceRefs: { assetIds: t.evidenceRefs, crossingId: t.crossingId },
            },
          });

          // Link entry points
          const resolvedEPs = resolveAssetNames(t.entryPoints, assetNameToId, {
            threatId: threat.id,
            field: "entryPoints",
          });

          if (resolvedEPs.length === 0 && t.entryPoints.length > 0) {
            console.warn(
              `[threats] All entry points unresolved for threat "${t.title}" (id=${threat.id}) — skipping BFS entry point links`,
            );
          }

          for (const assetId of resolvedEPs) {
            await prisma.threatEntryPoint.create({ data: { threatId: threat.id, assetId } });
          }

          // Link impacted assets
          const resolvedIAs = resolveAssetNames(t.impactedAssets, assetNameToId, {
            threatId: threat.id,
            field: "impactedAssets",
          });
          for (const assetId of resolvedIAs) {
            await prisma.threatImpactedAsset.create({ data: { threatId: threat.id, assetId } });
          }

          totalThreats++;
        }
      }

      // STRIDE pass — batch 3 crossings per LLM call
      for (let i = 0; i < crossings.length; i += 3) {
        const batch = crossings.slice(i, i + 3);
        const crossingText = batch
          .map((c, idx) => `Crossing ${idx + 1} (ID: ${c.id}):\n${c.description}`)
          .join("\n\n");

        const userMessage = [
          systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
          `[CANONICAL MODEL]\n${canonicalContext}`,
          assetNameInstruction,
          `[TRUST BOUNDARY CROSSINGS TO ANALYZE]\n${crossingText}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        const result = await geminiStructuredCall<ThreatBatchResponse>({
          systemPrompt: STRIDE_SYSTEM_PROMPT,
          userMessage,
          responseSchema: THREAT_SCHEMA,
        });

        await persistThreats(result.threats, "stride");
      }

      // HEAVENS pass — only if automotive context detected
      {
        const heavensCrossingText = crossings
          .map((c, idx) => `Crossing ${idx + 1} (ID: ${c.id}):\n${c.description}`)
          .join("\n\n");

        const userMessage = [
          systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
          `[CANONICAL MODEL]\n${canonicalContext}`,
          assetNameInstruction,
          `[TRUST BOUNDARY CROSSINGS]\n${heavensCrossingText}`,
          "Determine if this system is automotive-related. If yes, generate HEAVENS threats. If not, return empty threats array.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const result = await geminiStructuredCall<ThreatBatchResponse>({
          systemPrompt: HEAVENS_SYSTEM_PROMPT,
          userMessage,
          responseSchema: THREAT_SCHEMA,
        });

        await persistThreats(result.threats, "heavens");
      }

      await setStepCompleted(runId, "threats");
      return { threatsGenerated: totalThreats, trustBoundariesAnalyzed: trustBoundaries.length };
    } catch (err) {
      await failRun(runId, "threats", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
