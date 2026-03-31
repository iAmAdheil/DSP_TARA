import type { FastifyReply, FastifyRequest } from "fastify";
import { IngestionService } from "./ingestion.service.js";

const service = new IngestionService();

export class IngestionController {
  async ingestRunContext(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
