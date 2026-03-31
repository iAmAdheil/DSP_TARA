import type { FastifyReply, FastifyRequest } from "fastify";
import { CvesService } from "./cves.service.js";

const service = new CvesService();

export class CvesController {
  async matchCves(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
