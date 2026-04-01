import type { FastifyInstance } from "fastify";
import { RisksController } from "./risks.controller.js";

const controller = new RisksController();

export function registerRisksRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/risks", controller.getRisks.bind(controller));
}
