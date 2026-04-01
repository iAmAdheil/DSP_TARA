import { z } from "zod";

export const getAttackPathsParamsSchema = z.object({
  runId: z.string().min(1),
});
