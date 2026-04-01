import { z } from "zod";

export const getRisksParamsSchema = z.object({
  runId: z.string().min(1),
});
