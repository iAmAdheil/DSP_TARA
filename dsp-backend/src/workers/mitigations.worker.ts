import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun, completeRun } from "../utils/run-progress.js";
import { geminiStructuredCall, SchemaType } from "../utils/gemini-client.js";

interface LLMMitigation {
  riskIndex: number;
  title: string;
  description: string;
  controlType: "technical" | "process" | "policy";
  estimatedEffort: "low" | "medium" | "high";
  expectedRiskReduction: number;
  validationSteps: string[];
}

interface MitigationBatchResponse {
  mitigations: LLMMitigation[];
}

const MITIGATION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    mitigations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          riskIndex: { type: SchemaType.NUMBER },
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          controlType: { type: SchemaType.STRING },
          estimatedEffort: { type: SchemaType.STRING },
          expectedRiskReduction: { type: SchemaType.NUMBER },
          validationSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["riskIndex", "title", "description", "controlType", "estimatedEffort", "expectedRiskReduction", "validationSteps"],
      },
    },
  },
  required: ["mitigations"],
};

const MITIGATION_SYSTEM_PROMPT = `You are a TARA mitigation recommendation engine.
For each risk item, recommend a specific, actionable mitigation.

Guidelines:
- Technical controls: code fixes, encryption, authentication, input validation, network segmentation
- Process controls: security reviews, penetration testing, monitoring, incident response
- Policy controls: access policies, data handling procedures, vendor requirements

Each mitigation should include:
- A clear title (short, actionable)
- Detailed description of what to implement
- Control type (technical, process, or policy)
- Estimated effort (low, medium, high)
- Expected risk reduction (0-1, where 1 = fully mitigates the risk)
- Ordered validation steps to verify the mitigation works

Be specific to the risk context — avoid generic advice.`;

/**
 * Mitigation Recommendation worker (Step 6 — final pipeline step).
 * Generates mitigations via Gemini in batches of 3.
 * After completing, marks the entire run as "completed".
 */
export const mitigationsWorker = new Worker(
  QueueNames.mitigations,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "mitigations");

      const riskItems = await prisma.riskItem.findMany({
        where: { runId },
        orderBy: { finalScore: "desc" },
        include: {
          threat: true,
          cveMatch: true,
          attackPath: true,
        },
      });

      const run = await prisma.run.findUniqueOrThrow({
        where: { id: runId },
        include: {
          project: { select: { systemContext: true } },
          assets: { select: { id: true, name: true, kind: true } },
        },
      });

      const systemContext = run.project.systemContext ?? "";
      const assetContext = run.assets.map((a) => `${a.name} (${a.kind})`).join(", ");

      let totalMitigations = 0;

      // Batch risk items in groups of 3
      for (let i = 0; i < riskItems.length; i += 3) {
        const batch = riskItems.slice(i, i + 3);

        const riskDescriptions = batch.map((risk, idx) => {
          let sourceDetail = "";
          if (risk.sourceType === "threat" && risk.threat) {
            sourceDetail = `Threat: "${risk.threat.title ?? risk.threat.description}" (${risk.threat.category}, confidence: ${risk.threat.confidence})`;
          } else if (risk.sourceType === "cve" && risk.cveMatch) {
            sourceDetail = `CVE: ${risk.cveMatch.cveIdentifier} — ${risk.cveMatch.description ?? "No description"} (CVSS: ${risk.cveMatch.cvssScore ?? "N/A"})`;
          } else if (risk.sourceType === "attack_path" && risk.attackPath) {
            sourceDetail = `Attack Path: entry=${risk.attackPath.startSurface}, target=${risk.attackPath.targetAssetId}, feasibility=${risk.attackPath.feasibilityScore}`;
          }

          return `Risk ${idx} (${risk.sourceType}, severity: ${risk.severity}, score: ${risk.finalScore.toFixed(2)}):\n${sourceDetail}\nFactor breakdown: likelihood=${risk.likelihood.toFixed(2)}, impact=${risk.impact.toFixed(2)}, exploitability=${risk.exploitability.toFixed(2)}, exposure=${risk.exposureModifier.toFixed(2)}`;
        }).join("\n\n");

        const userMessage = [
          systemContext ? `[SYSTEM CONTEXT]\n${systemContext}` : "",
          `[SYSTEM ASSETS]\n${assetContext}`,
          `[RISK ITEMS TO MITIGATE]\n${riskDescriptions}`,
        ].filter(Boolean).join("\n\n");

        const result = await geminiStructuredCall<MitigationBatchResponse>({
          systemPrompt: MITIGATION_SYSTEM_PROMPT,
          userMessage,
          responseSchema: MITIGATION_SCHEMA,
        });

        for (const m of result.mitigations) {
          const risk = batch[m.riskIndex];
          if (!risk) continue;

          const mitigation = await prisma.mitigation.create({
            data: {
              runId,
              title: m.title,
              controlType: m.controlType,
              description: m.description,
              estimatedEffort: m.estimatedEffort,
              expectedRiskReduction: Math.max(0, Math.min(1, m.expectedRiskReduction)),
              validationSteps: m.validationSteps,
            },
          });

          await prisma.mitigationRisk.create({
            data: { mitigationId: mitigation.id, riskItemId: risk.id },
          });

          totalMitigations++;
        }
      }

      await setStepCompleted(runId, "mitigations");
      await completeRun(runId);

      return { mitigationsGenerated: totalMitigations };
    } catch (err) {
      await failRun(runId, "mitigations", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
