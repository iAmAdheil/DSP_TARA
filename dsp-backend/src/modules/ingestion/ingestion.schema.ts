import { z } from "zod";

export const ingestionRequestSchema = z.object({
  runId: z.string().optional(),
});
