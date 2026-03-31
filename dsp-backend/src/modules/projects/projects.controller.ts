import type { FastifyReply, FastifyRequest } from "fastify";
import { ProjectsService } from "./projects.service.js";

const service = new ProjectsService();

export class ProjectsController {
  async createProject(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }

  async getProject(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(service.execute());
  }
}
