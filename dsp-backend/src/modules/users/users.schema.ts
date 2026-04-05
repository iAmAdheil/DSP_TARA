import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(["owner", "analyst", "reviewer", "viewer"]).optional(),
});

export const getUserParamsSchema = z.object({
  userId: z.string().min(1),
});

export const setActiveProjectSchema = z.object({
  projectId: z.string().min(1).nullable(),
});
