import { z } from "zod";

export const createRunParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const createRunBodySchema = z.object({
  configSnapshot: z.record(z.unknown()).optional(),
  artifacts: z.array(z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  })).min(1),
});

export const getRunParamsSchema = z.object({
  runId: z.string().min(1),
});

export const listRunsParamsSchema = z.object({
  projectId: z.string().min(1),
});
