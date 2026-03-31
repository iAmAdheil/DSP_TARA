import type { FastifyInstance } from "fastify";
import { IngestionController } from "./ingestion.controller.js";

const controller = new IngestionController();

export function registerIngestionRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/ingestion",
    handler: controller.ingestRunContext.bind(controller),
  });
}
