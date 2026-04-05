import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma-client.js";
import type { UserRole } from "@prisma/client";

export class EmailTakenError extends Error {
  constructor() {
    super("Email is already in use");
    this.name = "EmailTakenError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

function stripPasswordHash<T extends { passwordHash: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export class AuthService {
  async signUp(data: { name: string; email: string; password: string; role?: UserRole }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new EmailTakenError();

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? "analyst",
      },
    });

    return stripPasswordHash(user);
  }

  async signIn(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new InvalidCredentialsError();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return stripPasswordHash(updated);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return stripPasswordHash(user);
  }
}
