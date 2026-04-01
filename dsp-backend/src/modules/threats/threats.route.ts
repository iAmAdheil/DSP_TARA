import type { FastifyInstance } from "fastify";
import { ThreatsController } from "./threats.controller.js";

const controller = new ThreatsController();

export function registerThreatsRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/threats", controller.getThreats.bind(controller));
}
