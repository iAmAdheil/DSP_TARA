import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis-connection.js";
import { QueueNames } from "../queues/queue-names.js";
import { prisma } from "../db/prisma-client.js";
import { CveMatchTier } from "@prisma/client";
import { assertRunActive } from "../utils/gate-check.js";
import { setStepRunning, setStepCompleted, failRun } from "../utils/run-progress.js";
import { env } from "../config/env.js";
import { Redis } from "ioredis";

const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

const CACHE_TTL = 345600; // 4 days in seconds
const RATE_LIMIT_DELAY = 650; // ms between NVD API calls (~50 req/30s with key)

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

async function fetchNvdWithCache(cacheKey: string, url: string): Promise<NvdResponse> {
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    console.warn(`[cves] NVD returned ${response.status} for ${url} — returning empty`);
    return { vulnerabilities: [] };
  }

  const data = (await response.json()) as NvdResponse;
  await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL);
  return data;
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

/** Strip version segment from a CPE string to produce a base CPE. */
function baseProductCpe(cpe: string): string {
  // cpe:2.3:type:vendor:product:version:... → cpe:2.3:type:vendor:product:*:...
  const parts = cpe.split(":");
  if (parts.length >= 6) {
    parts[5] = "*";
    return parts.join(":");
  }
  return cpe;
}

async function persistCves(
  vulns: NvdResponse["vulnerabilities"],
  matchTier: CveMatchTier,
  runId: string,
  swId: string,
  assetId: string,
): Promise<number> {
  // Sort by CVSS descending before storing
  const sorted = [...vulns].sort((a, b) => {
    const sa = extractCvssScore(a.cve) ?? 0;
    const sb = extractCvssScore(b.cve) ?? 0;
    return sb - sa;
  });

  let count = 0;
  for (const vuln of sorted) {
    const cve = vuln.cve;
    const description =
      cve.descriptions.find((d) => d.lang === "en")?.value ?? cve.descriptions[0]?.value ?? "";
    const cvssScore = extractCvssScore(cve);
    const affectedVersions = extractAffectedVersions(cve);

    const cveMatch = await prisma.cveMatch.create({
      data: {
        runId,
        cveIdentifier: cve.id,
        description,
        matchTier,
        matchScore: cvssScore ? cvssScore / 10 : 0.5,
        cvssScore,
        affectedVersions: affectedVersions.length > 0 ? affectedVersions : undefined,
        publishedDate: new Date(cve.published),
        matchedSoftwareInstanceId: swId,
      },
    });

    await prisma.cveMatchAsset.create({
      data: { cveMatchId: cveMatch.id, assetId },
    });

    count++;
  }
  return count;
}

/**
 * CVE Matching worker (Step 3).
 * 3-tier waterfall: Tier 1 exact CPE → Tier 2 base CPE → Tier 3 keyword.
 * Exponential backoff on 429s. Per-instance error isolation.
 */
export const cvesWorker = new Worker(
  QueueNames.cveMatching,
  async (job) => {
    const { runId } = job.data as { runId: string };

    try {
      await assertRunActive(runId);
      await setStepRunning(runId, "cves");

      const softwareInstances = await prisma.softwareInstance.findMany({
        where: { runId },
        include: { asset: { select: { id: true } } },
      });

      let totalCves = 0;

      for (const sw of softwareInstances) {
        try {
          const fullCpe =
            sw.cpe ||
            `cpe:2.3:a:*:${sw.name.toLowerCase().replace(/\s+/g, "_")}:${sw.version ?? "*"}:*:*:*:*:*:*:*`;

          // ── Tier 1: Exact versioned CPE ──────────────────────────────
          const tier1CacheKey = `nvd:cpe:exact:${fullCpe}`;
          const tier1Url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(fullCpe)}`;
          const tier1 = await fetchNvdWithCache(tier1CacheKey, tier1Url);

          if (tier1.vulnerabilities.length > 0) {
            totalCves += await persistCves(tier1.vulnerabilities, CveMatchTier.exact, runId, sw.id, sw.asset.id);
            continue;
          }

          // ── Tier 2: Base CPE without version ─────────────────────────
          const baseCpe = baseProductCpe(fullCpe);
          const tier2CacheKey = `nvd:cpe:base:${baseCpe}`;
          const tier2Url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(baseCpe)}&isVulnerable=true&resultsPerPage=100`;
          const tier2 = await fetchNvdWithCache(tier2CacheKey, tier2Url);

          if (tier2.vulnerabilities.length > 0) {
            totalCves += await persistCves(tier2.vulnerabilities, CveMatchTier.near, runId, sw.id, sw.asset.id);
            continue;
          }

          // ── Tier 3: Keyword fallback (name only, exact match) ─────────
          const tier3CacheKey = `nvd:kw:${sw.name}`;
          const tier3Url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(sw.name)}&keywordExactMatch=true&resultsPerPage=20`;
          const tier3 = await fetchNvdWithCache(tier3CacheKey, tier3Url);

          if (tier3.vulnerabilities.length > 0) {
            totalCves += await persistCves(tier3.vulnerabilities, CveMatchTier.contextual, runId, sw.id, sw.asset.id);
          }
        } catch (swErr) {
          console.error(
            `[cves] Failed to fetch CVEs for "${sw.name}" (CPE: ${sw.cpe ?? "derived"}) — skipping. Error: ${swErr instanceof Error ? swErr.message : String(swErr)}`,
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
