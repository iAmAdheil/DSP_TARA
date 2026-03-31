import type { FastifyInstance } from "fastify";
import { ThreatsController } from "./threats.controller.js";

const controller = new ThreatsController();

export function registerThreatsRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/threats/generate",
    handler: controller.generateThreats.bind(controller),
  });
}
