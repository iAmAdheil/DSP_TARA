import type { FastifyReply, FastifyRequest } from "fastify";
import { RunsService } from "./runs.service.js";
import { createRunParamsSchema, createRunBodySchema, getRunParamsSchema, listRunsParamsSchema } from "./runs.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new RunsService();

export class RunsController {
  async createRun(request: FastifyRequest, reply: FastifyReply) {
    const params = createRunParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const body = createRunBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", body.error.message));
    }
    const run = await service.createRun(
      params.data.projectId,
      request.user.sub,
      body.data.artifacts,
      body.data.configSnapshot,
    );
    return reply.status(202).send(ok(run));
  }

  async getRun(request: FastifyRequest, reply: FastifyReply) {
    const params = getRunParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const run = await service.getRunById(params.data.runId);
    if (!run) {
      return reply.status(404).send(fail("NOT_FOUND", "Run not found"));
    }
    return reply.send(ok(run));
  }

  async getSoftwareInstances(request: FastifyRequest, reply: FastifyReply) {
    const params = getRunParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const instances = await service.getSoftwareInstances(params.data.runId);
    return reply.send(ok(instances));
  }

  async listRunsByProject(request: FastifyRequest, reply: FastifyReply) {
    const params = listRunsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const result = await service.getRunsByProjectId(params.data.projectId, request.user.sub);
    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        return reply.status(404).send(fail("NOT_FOUND", "Project not found"));
      }
      return reply.status(403).send(fail("FORBIDDEN", "Access denied"));
    }
    return reply.send(ok(result.data));
  }
}
