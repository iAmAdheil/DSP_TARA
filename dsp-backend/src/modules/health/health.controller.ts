import type { FastifyReply, FastifyRequest } from "fastify";
import { HealthService } from "./health.service.js";
const service = new HealthService();
export class HealthController {
  async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
