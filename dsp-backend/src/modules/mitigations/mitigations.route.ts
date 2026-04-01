import type { FastifyInstance } from "fastify";
import { MitigationsController } from "./mitigations.controller.js";

const controller = new MitigationsController();

export function registerMitigationsRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/mitigations", controller.getMitigations.bind(controller));
}
