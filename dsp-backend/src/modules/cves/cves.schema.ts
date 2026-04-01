import { z } from "zod";

export const getCvesParamsSchema = z.object({
  runId: z.string().min(1),
});
