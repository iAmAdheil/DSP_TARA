import type { FastifyInstance } from "fastify";
import { AssetsController } from "./assets.controller.js";

const controller = new AssetsController();

export function registerAssetsRoutes(app: FastifyInstance) {
  app.get("/runs/:runId/assets", controller.getAssets.bind(controller));
}
