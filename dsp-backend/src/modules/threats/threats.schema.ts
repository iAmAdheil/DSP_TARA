import { z } from "zod";

export const getThreatsParamsSchema = z.object({
  runId: z.string().min(1),
});
