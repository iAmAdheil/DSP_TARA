import type { FastifyInstance } from "fastify";
import { UsersController } from "./users.controller.js";

const controller = new UsersController();

export function registerUsersRoutes(app: FastifyInstance) {
  // POST /users removed — use POST /auth/sign-up instead
  app.patch("/users/me/active-project", controller.setActiveProject.bind(controller));
  app.get("/users/:userId", controller.getUser.bind(controller));
}
