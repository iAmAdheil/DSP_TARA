import type { FastifyInstance } from "fastify";

import { registerHealthRoutes } from "../../modules/health/index.js";
import { registerAuthRoutes, AuthController } from "../../modules/auth/index.js";
import { registerUsersRoutes } from "../../modules/users/index.js";

const authController = new AuthController();
import { registerProjectsRoutes } from "../../modules/projects/index.js";
import { registerRunsRoutes } from "../../modules/runs/index.js";
import { registerAssetsRoutes } from "../../modules/assets/index.js";
import { registerIngestionRoutes } from "../../modules/ingestion/index.js";
import { registerThreatsRoutes } from "../../modules/threats/index.js";
import { registerCvesRoutes } from "../../modules/cves/index.js";
import { registerAttackPathsRoutes } from "../../modules/attack-paths/index.js";
import { registerRisksRoutes } from "../../modules/risks/index.js";
import { registerMitigationsRoutes } from "../../modules/mitigations/index.js";
import { registerExportsRoutes } from "../../modules/exports/index.js";

export function registerRoutes(app: FastifyInstance) {
  // 1. Unprotected routes
  registerHealthRoutes(app);
  registerAuthRoutes(app);

  // Live OpenAPI spec — populated automatically as routes gain `schema:` options
  app.get("/openapi.json", async (_req, reply) => {
    reply.header("Content-Type", "application/json");
    return app.swagger();
  });

  // 2. Protected routes — scoped so the auth hook only applies here
  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.authenticate);

    protectedApp.get("/auth/profile", authController.getProfile.bind(authController));
    registerUsersRoutes(protectedApp);
    registerProjectsRoutes(protectedApp);
    registerRunsRoutes(protectedApp);
    registerAssetsRoutes(protectedApp);
    registerIngestionRoutes(protectedApp);
    registerThreatsRoutes(protectedApp);
    registerCvesRoutes(protectedApp);
    registerAttackPathsRoutes(protectedApp);
    registerRisksRoutes(protectedApp);
    registerMitigationsRoutes(protectedApp);
    registerExportsRoutes(protectedApp);
  });
}
