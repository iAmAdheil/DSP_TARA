import type { FastifyReply, FastifyRequest } from "fastify";
import { AttackPathsService } from "./attack-paths.service.js";
import { getAttackPathsParamsSchema } from "./attack-paths.schema.js";
import { ok, fail } from "../../utils/http-response.js";

const service = new AttackPathsService();

export class AttackPathsController {
  async getAttackPaths(request: FastifyRequest, reply: FastifyReply) {
    const params = getAttackPathsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }
    const paths = await service.getByRunId(params.data.runId);
    return reply.send(ok(paths));
  }
}
