import { z } from "zod";

export const exportsRequestSchema = z.object({
  runId: z.string().optional(),
});
