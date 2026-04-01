import type { FastifyReply, FastifyRequest } from "fastify";
import { HealthService } from "./health.service.js";
import { ok } from "../../utils/http-response.js";

const service = new HealthService();

export class HealthController {
  async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    const result = await service.check();
    const code = result.status === "ok" ? 200 : 503;
    return reply.status(code).send(ok(result));
  }
}
