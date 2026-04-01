import type { FastifyReply, FastifyRequest } from "fastify";
import { ThreatsService } from "./threats.service.js";
import { getThreatsParamsSchema } from "./threats.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new ThreatsService();

export class ThreatsController {
  async getThreats(request: FastifyRequest, reply: FastifyReply) {
    const params = getThreatsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const threats = await service.getByRunId(params.data.runId);
    return reply.send(ok(threats));
  }
}
