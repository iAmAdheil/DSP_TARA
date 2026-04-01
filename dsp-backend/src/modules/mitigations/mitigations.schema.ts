import { z } from "zod";

export const getMitigationsParamsSchema = z.object({
  runId: z.string().min(1),
});
