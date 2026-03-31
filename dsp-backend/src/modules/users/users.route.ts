import type { FastifyInstance } from "fastify";
import { UsersController } from "./users.controller.js";

const controller = new UsersController();

export function registerUsersRoutes(app: FastifyInstance) {
  app.route({ method: "POST", url: "/users", handler: controller.createUser.bind(controller) });
  app.get("/users/:userId", controller.getUser.bind(controller));
}
