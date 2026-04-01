import type { FastifyReply, FastifyRequest } from "fastify";
import { CvesService } from "./cves.service.js";
import { getCvesParamsSchema } from "./cves.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new CvesService();

export class CvesController {
  async getCves(request: FastifyRequest, reply: FastifyReply) {
    const params = getCvesParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const cves = await service.getByRunId(params.data.runId);
    return reply.send(ok(cves));
  }
}
