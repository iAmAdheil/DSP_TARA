import type { FastifyInstance } from "fastify";
import { ExportsController } from "./exports.controller.js";

const controller = new ExportsController();

export function registerExportsRoutes(app: FastifyInstance) {
  app.route({
    method: "POST",
    url: "/runs/:runId/exports",
    handler: controller.createExport.bind(controller),
  });
}
