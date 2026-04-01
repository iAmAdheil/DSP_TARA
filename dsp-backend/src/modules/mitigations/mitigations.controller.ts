import type { FastifyReply, FastifyRequest } from "fastify";
import { MitigationsService } from "./mitigations.service.js";
import { getMitigationsParamsSchema } from "./mitigations.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new MitigationsService();

export class MitigationsController {
  async getMitigations(request: FastifyRequest, reply: FastifyReply) {
    const params = getMitigationsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const mitigations = await service.getByRunId(params.data.runId);
    return reply.send(ok(mitigations));
  }
}
