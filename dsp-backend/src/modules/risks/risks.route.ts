import type { FastifyInstance } from "fastify";
import { RisksController } from "./risks.controller.js";

const controller = new RisksController();

export function registerRisksRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/risks/score",
    handler: controller.scoreRisks.bind(controller),
  });
}
