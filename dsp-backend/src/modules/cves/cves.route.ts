import type { FastifyInstance } from "fastify";
import { CvesController } from "./cves.controller.js";

const controller = new CvesController();

export function registerCvesRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/cves/match",
    handler: controller.matchCves.bind(controller),
  });
}
