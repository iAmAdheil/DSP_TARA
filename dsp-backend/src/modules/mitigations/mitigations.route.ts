import type { FastifyInstance } from "fastify";
import { MitigationsController } from "./mitigations.controller.js";

const controller = new MitigationsController();

export function registerMitigationsRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/mitigations/recommend",
    handler: controller.recommendMitigations.bind(controller),
  });
}
