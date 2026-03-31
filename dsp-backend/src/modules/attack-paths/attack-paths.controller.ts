import type { FastifyReply, FastifyRequest } from "fastify";
import { AttackPathsService } from "./attack-paths.service.js";

const service = new AttackPathsService();

export class AttackPathsController {
  async buildAttackPaths(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
