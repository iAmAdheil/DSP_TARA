import { z } from "zod";

export const createExportParamsSchema = z.object({
  runId: z.string().min(1),
});

export const createExportBodySchema = z.object({
  format: z.enum(["json", "md", "pdf"]),
});

export const getExportsParamsSchema = z.object({
  runId: z.string().min(1),
});
