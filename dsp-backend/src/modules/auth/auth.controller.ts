import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService, EmailTakenError, InvalidCredentialsError } from "./auth.service.js";
import { signUpSchema, signInSchema } from "./auth.schema.js";
import { ok, fail } from "../../utils/http-response.js";
import { env } from "../../config/env.js";

const service = new AuthService();

function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.nodeEnv === "production",
  });
}

export class AuthController {
  async signUp(request: FastifyRequest, reply: FastifyReply) {
    const parsed = signUpSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", parsed.error.message));
    }

    try {
      const user = await service.signUp(parsed.data);
      const token = request.server.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: "7d" });
      setAuthCookie(reply, token);
      return reply.status(201).send(ok(user));
    } catch (err) {
      if (err instanceof EmailTakenError) {
        return reply.status(409).send(fail("EMAIL_TAKEN", err.message));
      }
      throw err;
    }
  }

  async signIn(request: FastifyRequest, reply: FastifyReply) {
    const parsed = signInSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail("VALIDATION_ERROR", parsed.error.message));
    }

    try {
      const user = await service.signIn(parsed.data.email, parsed.data.password);
      const token = request.server.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: "7d" });
      setAuthCookie(reply, token);
      return reply.status(200).send(ok(user));
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return reply.status(401).send(fail("INVALID_CREDENTIALS", err.message));
      }
      throw err;
    }
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    // request.user is already set by the authenticate hook
    const user = await service.getProfile(request.user.sub);
    if (!user) {
      return reply.status(401).send(fail("UNAUTHORIZED", "User not found"));
    }
    return reply.send(ok(user));
  }
}
