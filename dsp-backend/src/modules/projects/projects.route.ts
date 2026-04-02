import type { FastifyInstance } from "fastify";
import { ProjectsController } from "./projects.controller.js";

const controller = new ProjectsController();

export function registerProjectsRoutes(app: FastifyInstance) {
  app.post("/projects", controller.createProject.bind(controller));
  app.get("/projects/:projectId", controller.getProject.bind(controller));
  app.patch("/projects/:projectId", controller.updateProject.bind(controller));
}
