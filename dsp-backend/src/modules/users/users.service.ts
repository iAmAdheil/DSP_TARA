import { prisma } from "../../db/prisma-client.js";

export class UsersService {
  async setActiveProject(userId: string, projectId: string | null) {
    if (projectId !== null) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, createdBy: userId },
      });
      if (!project) return null; // not found or not owned
    }

    const { passwordHash: _ph, ...safe } = await prisma.user.update({
      where: { id: userId },
      data: { activeProjectId: projectId },
    });
    return safe;
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}
