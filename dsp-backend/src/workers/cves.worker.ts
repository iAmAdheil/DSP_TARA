import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { CveMatchTier } from "@prisma/client";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import { env } from "../config/env.js";
import { Redis } from "ioredis";
import { geminiStructuredCall, SchemaType } from "../utils/gemini-client.js";

const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

const CACHE_TTL = 172800; // 2 days in seconds
const RATE_LIMIT_DELAY = 650; // ms between NVD API calls (~50 req/30s with key)
const WHYRELEVANT_BATCH_SIZE = 50;

// Asset kinds treated as external-facing for exposure modifier computation
const EXTERNAL_KINDS = new Set(["Cloud Service", "cloud-service", "HMI", "Gateway"]);

interface NvdCve {
  id: string;
  descriptions: Array<{ lang: string; value: string }>;
  published: string;
  metrics?: {
    cvssMetricV31?: Array<{ cvssData: { baseScore: number } }>;
    cvssMetricV2?: Array<{ cvssData: { baseScore: number } }>;
  };
  configurations?: Array<{
    nodes: Array<{
      cpeMatch: Array<{ criteria: string; versionStartIncluding?: string; versionEndIncluding?: string }>;
    }>;
  }>;
}

interface NvdResponse {
  vulnerabilities: Array<{ cve: NvdCve }>;
}

interface WhyRelevantEntry {
  cveId: string;
  whyRelevant: string;
}

interface WhyRelevantBatchResponse {
  entries: WhyRelevantEntry[];
}

const WHY_RELEVANT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    entries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          cveId: { type: SchemaType.STRING },
          whyRelevant: { type: SchemaType.STRING },
        },
        required: ["cveId", "whyRelevant"],
      },
    },
  },
  required: ["entries"],
};

const nvdHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { Accept: "application/json" };
  if (env.nvdApiKey) h["apiKey"] = env.nvdApiKey;
  return h;
};

/** Fetch with exponential backoff on 429s. Throws on final failure. */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers: nvdHeaders() });
    if (res.status === 429) {
      const delay = 1000 * 2 ** attempt; // 1s, 2s, 4s
      console.warn(`[cves] NVD rate limit hit (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms — ${url}`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    return res;
  }
  throw new Error(`NVD API failed after ${retries} retries: ${url}`);
}

/**
 * Fetch a single 120-day NVD window for the given CPE, with Redis caching.
 * Cache key is stable per CPE + date window so repeated runs reuse results.
 */
async function fetchWindowWithCache(
  cpe: string,
  start: string,
  end: string,
): Promise<NvdResponse> {
  const cacheKey = `nvd:cpe:window:${cpe}:${start.slice(0, 10)}:${end.slice(0, 10)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));

  const url =
    `https://services.nvd.nist.gov/rest/json/cves/2.0` +
    `?cpeName=${encodeURIComponent(cpe)}` +
    `&pubStartDate=${encodeURIComponent(start)}` +
    `&pubEndDate=${encodeURIComponent(end)}` +
    `&resultsPerPage=200`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.warn(`[cves] NVD ${res.status} for window ${start.slice(0, 10)}–${end.slice(0, 10)}, CPE ${cpe}`);
    return { vulnerabilities: [] };
  }

  const data = (await res.json()) as NvdResponse;
  await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL);
  return data;
}

/**
 * Build consecutive 120-day windows covering the last `yearsBack` years.
 * NVD ISO 8601 format: 2024-01-01T00:00:000 (milliseconds trimmed to 000).
 */
function buildDateWindows(yearsBack: number): Array<{ start: string; end: string }> {
  const windows: Array<{ start: string; end: string }> = [];
  let end = new Date();
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack);

  while (end > cutoff) {
    const start = new Date(Math.max(end.getTime() - 120 * 24 * 60 * 60 * 1000, cutoff.getTime()));
    windows.push({
      start: start.toISOString().replace(/\.\d{3}Z$/, ".000"),
      end: end.toISOString().replace(/\.\d{3}Z$/, ".000"),
    });
    end = new Date(start.getTime() - 1);
  }
  return windows;
}

function extractCvssScore(cve: NvdCve): number | null {
  const v31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore;
  if (v31 !== undefined) return v31;
  const v2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore;
  if (v2 !== undefined) return v2;
  return null;
}

function extractAffectedVersions(cve: NvdCve): string[] {
  const versions: string[] = [];
  for (const config of cve.configurations ?? []) {
    for (const node of config.nodes) {
      for (const match of node.cpeMatch) {
        versions.push(match.criteria);
      }
    }
  }
  return versions;
}

/**
 * Compute asset exposure modifier using data flow connections.
 * Uses asset kind as a reliable proxy — avoids trust boundary metadata
 * which may not be populated during ingestion.
 *
 * Returns 1.0 if a data flow connects to an external-kind asset (implies trust
 * boundary crossing), 0.7 if any data flow exists but none to external kinds,
 * or 0.4 for assets with no data flows (purely internal).
 */
async function computeExposureModifier(assetId: string, runId: string): Promise<number> {
  const dataFlows = await prisma.dataFlow.findMany({
    where: {
      runId,
      OR: [{ sourceId: assetId }, { targetId: assetId }],
    },
    include: {
      source: { select: { kind: true } },
      target: { select: { kind: true } },
    },
  });

  const crossesTrustBoundary = dataFlows.some((df) => {
    const otherKind = df.sourceId === assetId ? df.target.kind : df.source.kind;
    return EXTERNAL_KINDS.has(otherKind);
  });

  if (crossesTrustBoundary) return 1.0;

  const hasExternalFlow = dataFlows.length > 0;
  return hasExternalFlow ? 0.7 : 0.4;
}

function assetPositionLabel(modifier: number): string {
  if (modifier >= 1.0) return "trust-boundary-crossing";
  if (modifier >= 0.7) return "external-facing";
  return "internal";
}

/**
 * Batched Gemini call to generate whyRelevant per CVE for a software instance.
 * Processes in batches of WHYRELEVANT_BATCH_SIZE. Failures silently null the field.
 */
async function fetchWhyRelevant(
  systemContext: string,
  swName: string,
  swVersion: string | null,
  assetName: string,
  assetKind: string,
  assetPosition: string,
  cves: Array<{ cveIdentifier: string; description: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (let i = 0; i < cves.length; i += WHYRELEVANT_BATCH_SIZE) {
    const batch = cves.slice(i, i + WHYRELEVANT_BATCH_SIZE);

    const cveList = batch
      .map((c, idx) => `${idx + 1}. ${c.cveIdentifier} — ${c.description.slice(0, 300)}`)
      .join("\n");

    const userMessage = [
      `System context:\n${systemContext}`,
      ``,
      `Software component: ${swName} ${swVersion ?? ""} running on ${assetName} (${assetKind})`,
      `Asset position: ${assetPosition}`,
      ``,
      `For each CVE below, write 1-2 sentences explaining whether and how it is relevant to this specific component in this system. Be honest — if a CVE targets a different product or context entirely, say so clearly. Do not force relevance.`,
      ``,
      `CVEs:`,
      cveList,
    ].join("\n");

    try {
      const response = await geminiStructuredCall<WhyRelevantBatchResponse>({
        systemPrompt:
          "You are a security analyst evaluating CVEs for relevance to a specific software component in an embedded automotive system.",
        userMessage,
        responseSchema: WHY_RELEVANT_SCHEMA,
      });

      for (const entry of response.entries ?? []) {
        if (entry.cveId && entry.whyRelevant) {
          result.set(entry.cveId, entry.whyRelevant);
        }
      }
    } catch (err) {
      console.warn(
        `[cves] Gemini whyRelevant call failed for batch at index ${i} — skipping. Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}

/**
 * CVE Matching worker (Step 3).
 * Fetches CVEs via multi-window NVD queries covering the last 3 years (~9 calls of 120-day windows).
 * Exposure modifier derived from data flow connections rather than trust boundary metadata.
 * matchScore = 0.5 × (cvssScore/10) + 0.5 × exposureModifier (null cvssScore → 0.5 neutral).
 * whyRelevant populated per CVE via batched Gemini call per software instance.
 */
export const cvesWorker = new Worker(
  QueueNames.cveMatching,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "cves");

      const [softwareInstances, artifact] = await Promise.all([
        prisma.softwareInstance.findMany({
          where: { runId },
          include: { asset: { select: { id: true, name: true, kind: true } } },
        }),
        prisma.inputArtifact.findFirst({ where: { runId } }),
      ]);

      const systemContext = artifact?.content ?? "";
      const windows = buildDateWindows(3);

      let totalCves = 0;

      for (const sw of softwareInstances) {
        try {
          const fullCpe =
            sw.cpe ||
            `cpe:2.3:a:*:${sw.name.toLowerCase().replace(/\s+/g, "_")}:${sw.version ?? "*"}:*:*:*:*:*:*:*`;

          // Compute exposure modifier from data flows (reliable ingestion data)
          const exposureModifier = await computeExposureModifier(sw.asset.id, runId);

          // ── Multi-window fetch covering last 3 years ──────────────────
          const allVulns: NvdResponse["vulnerabilities"] = [];
          for (const window of windows) {
            const result = await fetchWindowWithCache(fullCpe, window.start, window.end);
            allVulns.push(...result.vulnerabilities);
          }

          // Deduplicate by CVE ID
          const deduped = [...new Map(allVulns.map((v) => [v.cve.id, v])).values()];

          if (deduped.length === 0) {
            // No results for this CPE in the 3-year window — no keyword fallback in V1
            continue;
          }

          // ── Batched Gemini call for whyRelevant ───────────────────────
          const assetPosition = assetPositionLabel(exposureModifier);
          const cveDataForGemini = deduped.map((vuln) => ({
            cveIdentifier: vuln.cve.id,
            description:
              vuln.cve.descriptions.find((d) => d.lang === "en")?.value ??
              vuln.cve.descriptions[0]?.value ??
              "",
          }));

          const whyRelevantMap = await fetchWhyRelevant(
            systemContext,
            sw.name,
            sw.version,
            sw.asset.name,
            sw.asset.kind,
            assetPosition,
            cveDataForGemini,
          );

          // ── Persist ───────────────────────────────────────────────────
          for (const vuln of deduped) {
            const cve = vuln.cve;
            const description =
              cve.descriptions.find((d) => d.lang === "en")?.value ??
              cve.descriptions[0]?.value ??
              "";
            const cvssScore = extractCvssScore(cve);
            const affectedVersions = extractAffectedVersions(cve);
            // matchScore = 0.5 × (cvssScore/10) + 0.5 × exposureModifier
            // If cvssScore is null, substitute 0.5 (neutral) for the CVSS component
            const matchScore = Math.min(1, 0.5 * ((cvssScore ?? 5) / 10) + 0.5 * exposureModifier);

            const cveMatch = await prisma.cveMatch.create({
              data: {
                runId,
                cveIdentifier: cve.id,
                description,
                matchTier: CveMatchTier.exact,
                matchScore,
                cvssScore,
                affectedVersions: affectedVersions.length > 0 ? affectedVersions : undefined,
                publishedDate: new Date(cve.published),
                matchedSoftwareInstanceId: sw.id,
                whyRelevant: whyRelevantMap.get(cve.id) ?? null,
              },
            });

            await prisma.cveMatchAsset.create({
              data: { cveMatchId: cveMatch.id, assetId: sw.asset.id },
            });

            totalCves++;
          }
        } catch (swErr) {
          console.error(
            `[cves] Failed to process "${sw.name}" (CPE: ${sw.cpe ?? "derived"}) — skipping. Error: ${swErr instanceof Error ? swErr.message : String(swErr)}`,
          );
        }
      }

      await setStepCompleted(runId, "cves");
      return { cvesMatched: totalCves, softwareInstancesChecked: softwareInstances.length };
    } catch (err) {
      await failRun(runId, "cves", err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);
