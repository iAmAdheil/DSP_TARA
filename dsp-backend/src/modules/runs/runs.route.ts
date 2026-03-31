import type { FastifyInstance } from "fastify";
import { RunsController } from "./runs.controller.js";

const controller = new RunsController();

export function registerRunsRoutes(app: FastifyInstance) {
  app.get("/runs/:runId", controller.getRun.bind(controller));
  app.post("/projects/:projectId/runs", controller.createRun.bind(controller));
}
