import { prisma } from "../../db/prisma-client.js";
import type { UserRole } from "@prisma/client";

export class UsersService {
  async createUser(data: { name: string; email: string; role?: UserRole }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role ?? "analyst",
      },
    });
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}
