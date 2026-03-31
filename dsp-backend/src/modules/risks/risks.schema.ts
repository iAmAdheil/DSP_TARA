import { z } from "zod";

export const risksRequestSchema = z.object({
  runId: z.string().optional(),
});
