import type { FastifyInstance } from "fastify";
import { HealthController } from "./health.controller.js";
const controller = new HealthController();
export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", controller.getHealth.bind(controller));
}
