import { z } from "zod";

export const mitigationsRequestSchema = z.object({
  runId: z.string().optional(),
});
