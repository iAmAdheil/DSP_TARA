import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import type { FastifyInstance } from "fastify";

import { registerHealthRoutes } from "../../modules/health/index.js";
import { registerUsersRoutes } from "../../modules/users/index.js";
import { registerProjectsRoutes } from "../../modules/projects/index.js";
import { registerRunsRoutes } from "../../modules/runs/index.js";
import { registerIngestionRoutes } from "../../modules/ingestion/index.js";
import { registerThreatsRoutes } from "../../modules/threats/index.js";
import { registerCvesRoutes } from "../../modules/cves/index.js";
import { registerAttackPathsRoutes } from "../../modules/attack-paths/index.js";
import { registerRisksRoutes } from "../../modules/risks/index.js";
import { registerMitigationsRoutes } from "../../modules/mitigations/index.js";
import { registerExportsRoutes } from "../../modules/exports/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openapiSpec = parseYaml(
  readFileSync(resolve(__dirname, "../../../openapi.yaml"), "utf-8")
);

export function registerRoutes(app: FastifyInstance) {
  registerHealthRoutes(app);
  registerUsersRoutes(app);
  registerProjectsRoutes(app);
  registerRunsRoutes(app);
  registerIngestionRoutes(app);
  registerThreatsRoutes(app);
  registerCvesRoutes(app);
  registerAttackPathsRoutes(app);
  registerRisksRoutes(app);
  registerMitigationsRoutes(app);
  registerExportsRoutes(app);

  // Serve the OpenAPI spec as JSON — point any Swagger UI / Scalar client here
  app.get("/openapi.json", async (_req, reply) => {
    reply.header("Content-Type", "application/json");
    return openapiSpec;
  });
}
