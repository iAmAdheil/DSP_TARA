import type { FastifyReply, FastifyRequest } from "fastify";
import { ThreatsService } from "./threats.service.js";

const service = new ThreatsService();

export class ThreatsController {
  async generateThreats(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
