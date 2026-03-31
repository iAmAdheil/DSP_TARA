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
}
