import type { FastifyReply, FastifyRequest } from "fastify";
import { ExportsService } from "./exports.service.js";

const service = new ExportsService();

export class ExportsController {
  async createExport(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
