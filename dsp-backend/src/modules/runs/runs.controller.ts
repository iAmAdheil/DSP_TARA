import type { FastifyReply, FastifyRequest } from "fastify";
import { RunsService } from "./runs.service.js";
import { createRunParamsSchema, createRunBodySchema, getRunParamsSchema } from "./runs.schema.js";
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
      body.data.initiatedBy,
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
}
