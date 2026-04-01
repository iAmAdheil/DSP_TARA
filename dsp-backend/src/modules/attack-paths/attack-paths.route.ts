import type { FastifyInstance } from "fastify";
import { AttackPathsController } from "./attack-paths.controller.js";

const controller = new AttackPathsController();

export function registerAttackPathsRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/attack-paths", controller.getAttackPaths.bind(controller));
}
