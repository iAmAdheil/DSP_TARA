import type { FastifyInstance } from "fastify";
import { ExportsController } from "./exports.controller.js";

const controller = new ExportsController();

export function registerExportsRoutes(app: FastifyInstance) {
  app.post("/runs/:runId/exports", controller.createExport.bind(controller));
  app.get("/runs/:runId/exports", controller.getExports.bind(controller));
}
