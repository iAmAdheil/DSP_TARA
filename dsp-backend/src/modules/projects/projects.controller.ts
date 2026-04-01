import type { FastifyReply, FastifyRequest } from "fastify";
import { ProjectsService } from "./projects.service.js";
import { createProjectSchema, getProjectParamsSchema } from "./projects.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new ProjectsService();

export class ProjectsController {
  async createProject(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", parsed.error.message));
    }
    const project = await service.createProject(parsed.data);
    return reply.status(201).send(ok(project));
  }

  async getProject(request: FastifyRequest, reply: FastifyReply) {
    const params = getProjectParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const project = await service.getProjectById(params.data.projectId);
    if (!project) {
      return reply.status(404).send(fail("NOT_FOUND", "Project not found"));
    }
    return reply.send(ok(project));
  }
}
