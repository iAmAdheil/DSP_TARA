import type { FastifyReply, FastifyRequest } from "fastify";
import { MitigationsService } from "./mitigations.service.js";

const service = new MitigationsService();

export class MitigationsController {
  async recommendMitigations(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
