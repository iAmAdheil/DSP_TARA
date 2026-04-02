import { prisma } from "../../db/prisma-client.js";
import { geminiStructuredCall, SchemaType } from "../../utils/gemini-client.js";

interface ExtractedGraph {
  assets: Array<{
    name: string;
    type: string;
    subsystemTag: string;
  }>;
  interfaces: Array<{
    name: string;
    protocol: string;
    direction: string;
    endpointAssetNames: string[];
  }>;
  trustBoundaries: Array<{
    name: string;
    boundaryType: string;
    crossingInterfaceNames: string[];
  }>;
  softwareInstances: Array<{
    name: string;
    version: string;
    cpeCandidate: string;
    parentAssetName: string;
  }>;
  dataFlows: Array<{
    sourceAssetName: string;
    targetAssetName: string;
    dataClassification: string;
    protocol: string;
  }>;
  safetyFunctions: Array<{
    description: string;
    linkedAssetNames: string[];
    asilLevel?: string;
  }>;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a TARA (Threat Analysis and Risk Assessment) system model extraction engine.
Given a system description (system context) and component-level details (run artifacts), extract a canonical graph of entities.

Extract ALL of the following entity types. If information is ambiguous, make reasonable inferences based on automotive/embedded systems domain knowledge. Use concise, descriptive names.

Entity types to extract:
- Assets: Physical or logical components (ECUs, sensors, gateways, cloud services, mobile apps, etc.)
- Interfaces: Communication channels between assets (CAN bus, Ethernet, BLE, WiFi, USB, etc.)
- Trust Boundaries: Security perimeters that separate zones of different trust levels
- Software Instances: Software running on assets (firmware, OS, applications, libraries) with version info and CPE candidates
- Data Flows: Data movement between assets with classification (PII, safety-critical, diagnostic, etc.)
- Safety Functions: Safety-critical functions tied to specific assets (ASIL levels for automotive)

For CPE candidates, use the format: cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*
If you cannot determine the vendor, use * as placeholder.`;

const EXTRACTION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    assets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          subsystemTag: { type: SchemaType.STRING },
        },
        required: ["name", "type", "subsystemTag"],
      },
    },
    interfaces: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          protocol: { type: SchemaType.STRING },
          direction: { type: SchemaType.STRING },
          endpointAssetNames: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["name", "protocol", "direction", "endpointAssetNames"],
      },
    },
    trustBoundaries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          boundaryType: { type: SchemaType.STRING },
          crossingInterfaceNames: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["name", "boundaryType", "crossingInterfaceNames"],
      },
    },
    softwareInstances: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          version: { type: SchemaType.STRING },
          cpeCandidate: { type: SchemaType.STRING },
          parentAssetName: { type: SchemaType.STRING },
        },
        required: ["name", "version", "cpeCandidate", "parentAssetName"],
      },
    },
    dataFlows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sourceAssetName: { type: SchemaType.STRING },
          targetAssetName: { type: SchemaType.STRING },
          dataClassification: { type: SchemaType.STRING },
          protocol: { type: SchemaType.STRING },
        },
        required: ["sourceAssetName", "targetAssetName", "dataClassification", "protocol"],
      },
    },
    safetyFunctions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          linkedAssetNames: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          asilLevel: { type: SchemaType.STRING },
        },
        required: ["description", "linkedAssetNames"],
      },
    },
  },
  required: ["assets", "interfaces", "trustBoundaries", "softwareInstances", "dataFlows", "safetyFunctions"],
};

export class IngestionService {
  async ingest(runId: string) {
    // Fetch run with project context and artifacts
    const run = await prisma.run.findUniqueOrThrow({
      where: { id: runId },
      include: {
        project: { select: { systemContext: true } },
        artifacts: true,
      },
    });

    const systemContext = run.project.systemContext ?? "";
    const artifactTexts = run.artifacts.map((a) => a.content).join("\n\n");

    // Build LLM prompt
    const userMessage = [
      systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
      `[COMPONENT CONTEXT FOR THIS RUN]\n${artifactTexts}`,
    ].filter(Boolean).join("\n\n");

    // Call Gemini for structured extraction
    const extracted = await geminiStructuredCall<ExtractedGraph>({
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      userMessage,
      responseSchema: EXTRACTION_SCHEMA,
    });

    // Write entities to DB — build asset name→id map for FK resolution
    const assetNameToId = new Map<string, string>();

    // Create assets
    for (const asset of extracted.assets) {
      const created = await prisma.asset.create({
        data: {
          runId,
          name: asset.name,
          kind: asset.type,
          metadata: { subsystemTag: asset.subsystemTag },
        },
      });
      assetNameToId.set(asset.name, created.id);
    }

    // Create interfaces
    for (const iface of extracted.interfaces) {
      await prisma.interface.create({
        data: {
          runId,
          name: iface.name,
          protocol: iface.protocol,
          metadata: {
            direction: iface.direction,
            endpointAssetNames: iface.endpointAssetNames,
          },
        },
      });
    }

    // Create trust boundaries
    for (const tb of extracted.trustBoundaries) {
      await prisma.trustBoundary.create({
        data: {
          runId,
          name: tb.name,
          metadata: {
            boundaryType: tb.boundaryType,
            crossingInterfaceNames: tb.crossingInterfaceNames,
          },
        },
      });
    }

    // Create software instances
    for (const sw of extracted.softwareInstances) {
      const parentId = assetNameToId.get(sw.parentAssetName);
      if (!parentId) continue; // skip if parent asset not found
      await prisma.softwareInstance.create({
        data: {
          runId,
          assetId: parentId,
          name: sw.name,
          version: sw.version,
          cpe: sw.cpeCandidate,
        },
      });
    }

    // Create data flows
    for (const df of extracted.dataFlows) {
      const sourceId = assetNameToId.get(df.sourceAssetName);
      const targetId = assetNameToId.get(df.targetAssetName);
      if (!sourceId || !targetId) continue;
      await prisma.dataFlow.create({
        data: {
          runId,
          sourceId,
          targetId,
          protocol: df.protocol,
          dataClassification: df.dataClassification,
        },
      });
    }

    // Create safety functions — one row per linked asset
    for (const sf of extracted.safetyFunctions) {
      // Resolve ASIL level: LLM field first, then regex fallback from description
      const asilMatch = sf.description.match(/ASIL[- ]?([ABCD]|QM)/i);
      const asilLevel: string | null =
        sf.asilLevel ?? (asilMatch ? asilMatch[1].toUpperCase() : null);

      for (const assetName of sf.linkedAssetNames) {
        const assetId = assetNameToId.get(assetName);
        if (!assetId) {
          console.warn(
            `[ingestion] Linked asset not found for safety function "${sf.description}", assetName="${assetName}" — skipping`,
          );
          continue;
        }
        await prisma.safetyFunction.create({
          data: {
            runId,
            assetId,
            name: sf.description,
            asilLevel,
            metadata: { linkedAssetNames: sf.linkedAssetNames },
          },
        });
      }
    }

    // Compute model quality score: ratio of non-null/non-empty fields
    const totalEntities =
      extracted.assets.length +
      extracted.interfaces.length +
      extracted.trustBoundaries.length +
      extracted.softwareInstances.length +
      extracted.dataFlows.length +
      extracted.safetyFunctions.length;

    const expectedMinimum = 6; // at least one of each type
    const modelQualityScore = Math.min(1, totalEntities / (expectedMinimum * 3));

    return {
      artifactsProcessed: run.artifacts.length,
      entitiesExtracted: totalEntities,
      modelQualityScore,
    };
  }
}
