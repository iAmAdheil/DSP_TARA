import type { FastifyReply, FastifyRequest } from "fastify";
import { RunsService } from "./runs.service.js";

const service = new RunsService();

export class RunsController {
  async getRun(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }

  async createRun(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
