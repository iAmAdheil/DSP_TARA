import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.enum(["automotive", "general_system_security"]),
  createdBy: z.string().min(1),
});

export const getProjectParamsSchema = z.object({
  projectId: z.string().min(1),
});
