import { z } from "zod";

export const runsRequestSchema = z.object({
  runId: z.string().optional(),
});
