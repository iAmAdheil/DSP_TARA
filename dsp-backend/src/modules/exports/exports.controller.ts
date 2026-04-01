import type { FastifyReply, FastifyRequest } from "fastify";
import { ExportsService } from "./exports.service.js";
import {
  createExportParamsSchema,
  createExportBodySchema,
  getExportsParamsSchema,
} from "./exports.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new ExportsService();

export class ExportsController {
  async createExport(request: FastifyRequest, reply: FastifyReply) {
    const params = createExportParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const body = createExportBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", body.error.message));
    }

    const result = await service.createExport(params.data.runId, body.data.format);

    if (!result.ok) {
      const status = result.error === "NOT_FOUND" ? 404 : 409;
      return reply.status(status).send(fail(result.error, result.message));
    }

    return reply.status(202).send(ok(result.data));
  }

  async getExports(request: FastifyRequest, reply: FastifyReply) {
    const params = getExportsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const reports = await service.getExportsByRunId(params.data.runId);
    return reply.send(ok(reports));
  }
}
