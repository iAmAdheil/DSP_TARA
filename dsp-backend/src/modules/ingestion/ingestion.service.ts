// Ingestion business logic — called by the orchestrator worker, not by HTTP routes.
// TODO: Implement real parsing/normalization in iteration 2.

import { prisma } from "../../db/prisma-client.js";

export class IngestionService {
  /**
   * Parse input artifacts for a run and produce canonical model entities.
   * Currently a stub that creates placeholder assets from input artifacts.
   */
  async ingest(runId: string) {
    const artifacts = await prisma.inputArtifact.findMany({ where: { runId } });

    // TODO: Real implementation will:
    // - Parse each artifact type (text → LLM extraction, form → field mapping, file → parse)
    // - Build canonical graph: Asset[], Interface[], TrustBoundary[], SoftwareInstance[], DataFlow[], SafetyFunction[]
    // - Compute modelQualityScore
    // - Write assumption register + missing-data checklist

    // Stub: create a placeholder asset per artifact so downstream steps have something to work with
    for (const artifact of artifacts) {
      await prisma.asset.create({
        data: {
          runId,
          name: `Asset from ${artifact.type} artifact ${artifact.id}`,
          kind: "placeholder",
          metadata: { sourceArtifactId: artifact.id },
        },
      });
    }

    return { artifactsProcessed: artifacts.length };
  }
}
