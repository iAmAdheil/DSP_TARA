/**
 * Worker process entry point.
 * Starts all BullMQ workers. Run separately from the HTTP server:
 *   npx tsx src/worker.ts
 *
 * In production, use PM2 / Docker / k8s to manage worker processes.
 */
import { orchestratorWorker } from "./workers/orchestrator.worker.js";
import { threatsWorker } from "./workers/threats.worker.js";
import { cvesWorker } from "./workers/cves.worker.js";
import { attackPathsWorker } from "./workers/attack-paths.worker.js";
import { riskWorker } from "./workers/risk.worker.js";
import { mitigationsWorker } from "./workers/mitigations.worker.js";
import { exportsWorker } from "./workers/exports.worker.js";

const workers = [
  orchestratorWorker,
  threatsWorker,
  cvesWorker,
  attackPathsWorker,
  riskWorker,
  mitigationsWorker,
  exportsWorker,
];

console.log(`Starting ${workers.length} workers...`);
for (const w of workers) {
  console.log(`  ✓ ${w.name}`);
}

async function shutdown(signal: string) {
  console.log(`\n${signal} received — closing workers...`);
  await Promise.all(workers.map((w) => w.close()));
  console.log("All workers closed.");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
