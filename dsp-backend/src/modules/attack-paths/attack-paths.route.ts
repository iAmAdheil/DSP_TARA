import type { FastifyInstance } from "fastify";
import { AttackPathsController } from "./attack-paths.controller.js";

const controller = new AttackPathsController();

export function registerAttackPathsRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/attack-paths/build",
    handler: controller.buildAttackPaths.bind(controller),
  });
}
