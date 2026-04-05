import type { FastifyReply, FastifyRequest } from "fastify";
import { ProjectsService } from "./projects.service.js";
import { createProjectSchema, getProjectParamsSchema, updateProjectParamsSchema, updateProjectBodySchema } from "./projects.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new ProjectsService();

export class ProjectsController {
  async listProjects(request: FastifyRequest, reply: FastifyReply) {
    const projects = await service.getProjectsByUser(request.user.sub);
    return reply.send(ok(projects));
  }

  async createProject(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", parsed.error.message));
    }
    const project = await service.createProject({ ...parsed.data, createdBy: request.user.sub });
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
    if (project.createdBy !== request.user.sub) {
      return reply.status(403).send(fail("FORBIDDEN", "Access denied"));
    }
    return reply.send(ok(project));
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply) {
    const params = updateProjectParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const body = updateProjectBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", body.error.message));
    }
    const project = await service.getProjectById(params.data.projectId);
    if (!project) {
      return reply.status(404).send(fail("NOT_FOUND", "Project not found"));
    }
    if (project.createdBy !== request.user.sub) {
      return reply.status(403).send(fail("FORBIDDEN", "Access denied"));
    }
    const updated = await service.updateProject(params.data.projectId, body.data);
    return reply.send(ok(updated));
  }
}
