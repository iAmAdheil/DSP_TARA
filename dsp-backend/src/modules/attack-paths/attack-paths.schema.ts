import { z } from "zod";

export const attack_pathsRequestSchema = z.object({
  runId: z.string().optional(),
});
