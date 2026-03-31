import type { FastifyInstance } from "fastify";
import { ProjectsController } from "./projects.controller.js";

const controller = new ProjectsController();

export function registerProjectsRoutes(app: FastifyInstance) {
  app.route({ method: "POST", url: "/projects", handler: controller.createProject.bind(controller) });
  app.get("/projects/:projectId", controller.getProject.bind(controller));
}
