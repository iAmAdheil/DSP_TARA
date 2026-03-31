import { z } from "zod";

export const threatsRequestSchema = z.object({
  runId: z.string().optional(),
});
