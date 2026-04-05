import type { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller.js";

const controller = new AuthController();

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/sign-up", controller.signUp.bind(controller));
  app.post("/auth/sign-in", controller.signIn.bind(controller));
  // GET /auth/profile is registered in the protected scope in route-registry.ts
}
