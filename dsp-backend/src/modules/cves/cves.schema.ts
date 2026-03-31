import { z } from "zod";

export const cvesRequestSchema = z.object({
  runId: z.string().optional(),
});
