import type { FastifyReply, FastifyRequest } from "fastify";
import { UsersService } from "./users.service.js";
import { createUserSchema, getUserParamsSchema } from "./users.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new UsersService();

export class UsersController {
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", parsed.error.message));
    }
    const user = await service.createUser(parsed.data);
    return reply.status(201).send(ok(user));
  }

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const params = getUserParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const user = await service.getUserById(params.data.userId);
    if (!user) {
      return reply.status(404).send(fail("NOT_FOUND", "User not found"));
    }
    return reply.send(ok(user));
  }
}
