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

function normalizeSafetyImpact(raw: string): ImpactBreakdown["safetyImpact"] {
  const v = raw.toLowerCase();
  if (v.includes("catastrophic") || v.includes("extreme") || v.includes("loss of life") || v.includes("fatality")) return "catastrophic";
  if (v.includes("critical") || v.includes("severe") || v.includes("high") || v.includes("injur") || v.includes("fatal")) return "critical";
  if (v.includes("marginal") || v.includes("medium") || v.includes("minor") || v.includes("moderate")) return "marginal";
  return "negligible";
}

function normalizeFinancialImpact(raw: string): ImpactBreakdown["financialImpact"] {
  const v = raw.toLowerCase();
  if (v.includes("severe") || v.includes("extreme") || v.includes("recall") || v.includes("extensive brand damage")) return "severe";
  if (v.includes("significant") || v.includes("high") || v.includes("extensive") || v.includes("legal liabilit")) return "significant";
  if (v.includes("marginal") || v.includes("medium") || v.includes("minor") || v.includes("moderate")) return "marginal";
  return "negligible";
}

function normalizeOperationalImpact(raw: string): ImpactBreakdown["operationalImpact"] {
  const v = raw.toLowerCase();
  if (v.includes("complete_loss") || v.includes("complete loss") || v.includes("inoperable") || v.includes("unusable") || v.includes("unpredictably")) return "complete_loss";
  if (v.includes("loss_of_function") || v.includes("loss of function") || v.includes("unsafe") || v.includes("erroneously") || v.includes("critical") || v.includes("high")) return "loss_of_function";
  if (v.includes("degraded") || v.includes("medium") || v.includes("moderate") || v.includes("reduced")) return "degraded";
  return "negligible";
}

function normalizeImpactBreakdown(raw: ImpactBreakdown): ImpactBreakdown {
  return {
    safetyImpact: normalizeSafetyImpact(raw.safetyImpact),
    financialImpact: normalizeFinancialImpact(raw.financialImpact),
    operationalImpact: normalizeOperationalImpact(raw.operationalImpact),
  };
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
    safetyImpact: {
      type: SchemaType.STRING,
      enum: ["negligible", "marginal", "critical", "catastrophic"],
    },
    financialImpact: {
      type: SchemaType.STRING,
      enum: ["negligible", "marginal", "significant", "severe"],
    },
    operationalImpact: {
      type: SchemaType.STRING,
      enum: ["negligible", "degraded", "loss_of_function", "complete_loss"],
    },
  },
  required: ["safetyImpact", "financialImpact", "operationalImpact"],
};

const THREAT_SCHEMA_ITEMS_BASE = {
  crossingId: { type: SchemaType.STRING },
  framework: { type: SchemaType.STRING },
  title: { type: SchemaType.STRING },
  description: { type: SchemaType.STRING },
  entryPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  impactedAssets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  confidence: { type: SchemaType.NUMBER },
  evidenceRefs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  impactBreakdown: IMPACT_BREAKDOWN_SCHEMA,
};

const THREAT_SCHEMA_REQUIRED = [
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
];

const STRIDE_THREAT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    threats: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          ...THREAT_SCHEMA_ITEMS_BASE,
          category: { type: SchemaType.STRING },
        },
        required: THREAT_SCHEMA_REQUIRED,
      },
    },
  },
  required: ["threats"],
};

const HEAVENS_CATEGORY_ENUM = ["Safety", "Financial", "Operational", "Privacy", "Environmental", "Hazardous Event"];

const HEAVENS_THREAT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    threats: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          ...THREAT_SCHEMA_ITEMS_BASE,
          category: {
            type: SchemaType.STRING,
            enum: HEAVENS_CATEGORY_ENUM,
          },
        },
        required: THREAT_SCHEMA_REQUIRED,
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

HEAVENS threat categories — use ONLY these exact values for \`category\`:
- Safety: Threats that could cause physical harm to vehicle occupants or road users
- Financial: Threats causing economic damage — ransomware on OTA channels, unauthorized use of paid services, actions that could trigger recalls or warranty claims
- Operational: Threats causing vehicle malfunction, unavailability, or erratic behavior
- Privacy: Threats exposing driver/passenger location or personal data
- Environmental: Threats causing environmental damage (fuel spill, battery fire, etc.)
- Hazardous Event: Threats triggering hazardous situations not covered by Safety

Generate threats across multiple categories. Do not generate exclusively Safety threats.
For each trust boundary crossing, consider what financial damage an attacker could cause, not only what physical harm they could cause.
Set framework to "heavens" for all threats.
Assign confidence scores (0-1) reflecting automotive-specific risk assessment.`;

/** Build a case-insensitive lookup wrapper around a map. */
function makeCaseInsensitiveLookup<T>(map: Map<string, T>): (key: string) => T | undefined {
  const lower = new Map<string, T>();
  for (const [k, v] of map.entries()) lower.set(k.toLowerCase(), v);
  return (key: string) => map.get(key) ?? lower.get(key.toLowerCase());
}

/** Resolve asset names through direct, interface, and boundary maps, logging any misses. */
function resolveAssetNames(
  names: string[],
  assetNameToId: Map<string, string>,
  interfaceNameToAssetIds: Map<string, string[]>,
  boundaryNameToAssetIds: Map<string, string[]>,
  context: { threatId: string; field: string },
): string[] {
  const assetLookup = makeCaseInsensitiveLookup(assetNameToId);
  const ifaceLookup = makeCaseInsensitiveLookup(interfaceNameToAssetIds);
  const boundaryLookup = makeCaseInsensitiveLookup(boundaryNameToAssetIds);

  const resolved: string[] = [];
  for (const name of names) {
    const directId = assetLookup(name);
    if (directId) {
      resolved.push(directId);
      continue;
    }
    const ifaceIds = ifaceLookup(name);
    if (ifaceIds) {
      resolved.push(...ifaceIds);
      continue;
    }
    const boundaryIds = boundaryLookup(name);
    if (boundaryIds) {
      resolved.push(...boundaryIds);
      continue;
    }
    // Substring fallback — handles LLM abbreviations like "TCU" → "Telematics Control Unit (TCU)"
    let substringMatch: string | undefined;
    for (const [assetName, assetId] of assetNameToId.entries()) {
      const lowerKey = name.toLowerCase();
      const lowerAsset = assetName.toLowerCase();
      if (lowerKey.includes(lowerAsset) || lowerAsset.includes(lowerKey)) {
        substringMatch = assetId;
        break;
      }
    }
    if (substringMatch) {
      resolved.push(substringMatch);
      continue;
    }

    console.warn(
      `[threats] "${context.field}" name not found in any map — skipping. threatId=${context.threatId}, name="${name}"`,
    );
  }
  // Deduplicate — multiple interfaces can resolve to the same asset
  return [...new Set(resolved)];
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
        include: { project: { select: { systemContext: true, domain: true } } },
      });

      // Build asset name→id map
      const assetNameToId = new Map(assets.map((a) => [a.name, a.id]));

      // Interface name → set of endpoint asset IDs
      const interfaceNameToAssetIds = new Map<string, string[]>();
      for (const iface of interfaces) {
        const meta = iface.metadata as { endpointAssetNames?: string[] } | null;
        const endpointNames = meta?.endpointAssetNames ?? [];
        const resolvedIds = endpointNames
          .map((name) => assetNameToId.get(name))
          .filter((id): id is string => id !== undefined);
        if (resolvedIds.length > 0) {
          interfaceNameToAssetIds.set(iface.name, resolvedIds);
        }
      }

      // Trust boundary name → asset IDs (via crossing interfaces)
      const boundaryNameToAssetIds = new Map<string, string[]>();
      for (const tb of trustBoundaries) {
        const meta = tb.metadata as { crossingInterfaceNames?: string[] } | null;
        const crossingIfaceNames = meta?.crossingInterfaceNames ?? [];
        const assetIds = crossingIfaceNames.flatMap(
          (ifaceName) => interfaceNameToAssetIds.get(ifaceName) ?? []
        );
        const unique = [...new Set(assetIds)];
        if (unique.length > 0) {
          boundaryNameToAssetIds.set(tb.name, unique);
        }
      }

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
          // Resolve evidenceRefs to asset IDs (D10 — take first match per name; these are informational)
          const resolvedEvidenceIds = t.evidenceRefs
            .map((name) => assetNameToId.get(name) ?? interfaceNameToAssetIds.get(name)?.[0])
            .filter((id): id is string => id !== undefined);

          const threat = await prisma.threat.create({
            data: {
              runId,
              title: t.title,
              category: t.category,
              framework,
              description: t.description,
              confidence: Math.max(0, Math.min(1, t.confidence)),
              impactBreakdown: normalizeImpactBreakdown(t.impactBreakdown) as unknown as Prisma.InputJsonValue,
              evidenceRefs: { assetIds: resolvedEvidenceIds, crossingId: t.crossingId },
            },
          });

          // Link entry points — use LLM names first, fall back to crossing interface endpoints
          let resolvedEPs = resolveAssetNames(t.entryPoints, assetNameToId, interfaceNameToAssetIds, boundaryNameToAssetIds, {
            threatId: threat.id,
            field: "entryPoints",
          });

          if (resolvedEPs.length === 0) {
            // Derive entry points from the crossing interface (format: "{tbId}:{interfaceName}")
            const colonIdx = t.crossingId.indexOf(":");
            if (colonIdx !== -1) {
              const crossingIfaceName = t.crossingId.substring(colonIdx + 1);
              const ifaceAssetIds = interfaceNameToAssetIds.get(crossingIfaceName)
                ?? interfaceNameToAssetIds.get(crossingIfaceName.toLowerCase());
              if (ifaceAssetIds?.length) {
                resolvedEPs = ifaceAssetIds;
              }
            }
          }

          for (const assetId of resolvedEPs) {
            await prisma.threatEntryPoint.create({ data: { threatId: threat.id, assetId } });
          }

          // Link impacted assets
          const resolvedIAs = resolveAssetNames(t.impactedAssets, assetNameToId, interfaceNameToAssetIds, boundaryNameToAssetIds, {
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
          responseSchema: STRIDE_THREAT_SCHEMA,
        });

        await persistThreats(result.threats, "stride");
      }

      // HEAVENS pass — only for automotive domain
      if (run.project.domain === "automotive") {
        const heavensCrossingText = crossings
          .map((c, idx) => `Crossing ${idx + 1} (ID: ${c.id}):\n${c.description}`)
          .join("\n\n");

        const userMessage = [
          systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
          `[CANONICAL MODEL]\n${canonicalContext}`,
          assetNameInstruction,
          `[TRUST BOUNDARY CROSSINGS]\n${heavensCrossingText}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        const result = await geminiStructuredCall<ThreatBatchResponse>({
          systemPrompt: HEAVENS_SYSTEM_PROMPT,
          userMessage,
          responseSchema: HEAVENS_THREAT_SCHEMA,
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
