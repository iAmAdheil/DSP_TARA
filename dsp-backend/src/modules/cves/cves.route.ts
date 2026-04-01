import type { FastifyInstance } from "fastify";
import { CvesController } from "./cves.controller.js";

const controller = new CvesController();

export function registerCvesRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/cves", controller.getCves.bind(controller));
}
