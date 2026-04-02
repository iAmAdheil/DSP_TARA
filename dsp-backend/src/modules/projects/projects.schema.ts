import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.enum(["automotive", "general_system_security"]),
  createdBy: z.string().min(1),
  systemContext: z.string().optional(),
});

export const getProjectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const updateProjectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const updateProjectBodySchema = z.object({
  systemContext: z.string().min(1),
});
