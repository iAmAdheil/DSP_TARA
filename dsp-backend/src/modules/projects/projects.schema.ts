import { z } from "zod";

export const projectsRequestSchema = z.object({
  runId: z.string().optional(),
});
