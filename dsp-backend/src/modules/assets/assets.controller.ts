import type { FastifyReply, FastifyRequest } from "fastify";
import { AssetsService } from "./assets.service.js";
import { ok, fail } from "../../utils/http-response.js";
import { z } from "zod";

const service = new AssetsService();

const getAssetsParamsSchema = z.object({ runId: z.string().min(1) });

export class AssetsController {
  async getAssets(request: FastifyRequest, reply: FastifyReply) {
    const params = getAssetsParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", params.error.message));
    }

    const data = await service.getAssetsByRunId(params.data.runId);
    return reply.send(ok(data));
  }
}
