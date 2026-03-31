import type { FastifyReply, FastifyRequest } from "fastify";
import { UsersService } from "./users.service.js";

const service = new UsersService();

export class UsersController {
  async createUser(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }

  async getUser(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
