import type { FastifyReply, FastifyRequest } from "fastify";
import { RisksService } from "./risks.service.js";
import { getRisksParamsSchema } from "./risks.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new RisksService();

export class RisksController {
  async getRisks(request: FastifyRequest, reply: FastifyReply) {
    const params = getRisksParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const risks = await service.getByRunId(params.data.runId);
    return reply.send(ok(risks));
  }
}
