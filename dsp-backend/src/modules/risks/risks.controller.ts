import type { FastifyReply, FastifyRequest } from "fastify";
import { RisksService } from "./risks.service.js";

const service = new RisksService();

export class RisksController {
  async scoreRisks(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
