import { prisma } from "../../db/prisma-client.js";
import type { ProjectDomain } from "@prisma/client";

export class ProjectsService {
  async createProject(data: { name: string; domain: ProjectDomain; createdBy: string; systemContext?: string }) {
    return prisma.project.create({
      data: {
        name: data.name,
        domain: data.domain,
        createdBy: data.createdBy,
        systemContext: data.systemContext ?? null,
      },
      include: { creator: { select: { id: true, name: true } } },
    });
  }

  async getProjectById(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, name: true } },
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
          select: { id: true, status: true, startedAt: true, completedAt: true },
        },
      },
    });
  }

  async updateProject(projectId: string, data: { systemContext: string }) {
    return prisma.project.update({
      where: { id: projectId },
      data: { systemContext: data.systemContext },
      include: { creator: { select: { id: true, name: true } } },
    });
  }
}
