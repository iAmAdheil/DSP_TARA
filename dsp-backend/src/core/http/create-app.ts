import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import { Prisma } from "@prisma/client";
import { FastifyError } from "@fastify/error";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";

import { env } from "../../config/env.js";
import { fail } from "../../utils/http-response.js";
import { registerRoutes } from "./route-registry.js";

// Augment @fastify/jwt's FastifyJWT interface so request.user is typed correctly
// throughout the codebase without conflicting with @fastify/jwt's own declaration.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: { sub: string; email: string; role: UserRole };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function createApp() {
  const app = Fastify({ logger: true });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "DSP (Digital Security Platform) API",
        description:
          "Backend API for the Digital Security Platform — a TARA pipeline for threat analysis and risk assessment.",
        version: "1.1.0",
      },
      servers: [{ url: "http://localhost:4000", description: "Local development" }],
      tags: [
        { name: "Health", description: "Service health checks" },
        { name: "Auth", description: "Authentication — sign-up, sign-in, profile" },
        { name: "Users", description: "User management" },
        { name: "Projects", description: "Project management" },
        { name: "Runs", description: "Analysis pipeline runs" },
        { name: "Threats", description: "Threat analysis results" },
        { name: "CVEs", description: "CVE matching results" },
        { name: "Attack Paths", description: "Attack path analysis results" },
        { name: "Risks", description: "Risk scoring results" },
        { name: "Mitigations", description: "Mitigation recommendations" },
        { name: "Exports", description: "Report export generation" },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token",
            description: "JWT sent as an httpOnly cookie. Obtain via POST /auth/sign-in.",
          },
        },
      },
    },
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(cookie);
  await app.register(jwt, { secret: env.jwtSecret });

  app.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send(fail("UNAUTHORIZED", "Authentication required"));
      }
      try {
        const payload = app.jwt.verify<{ sub: string; email: string; role: UserRole }>(token);
        request.user = payload;
      } catch {
        return reply.status(401).send(fail("UNAUTHORIZED", "Invalid or expired token"));
      }
    },
  );

  app.setErrorHandler(function (err, req, reply) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply.status(409).send({ error: "A record with this value already exists." });
      }
      if (err.code === "P2003" || err.code === "P2025") {
        return reply.status(404).send({ error: "Related resource not found." });
      }
    }

    if (err instanceof FastifyError) {
      req.log.error({ err }, "request failed");
      return reply
        .status(err.statusCode || 500)
        .send({ ok: false, error: { code: err.code, message: err.message } });
    } else {
      reply.code(500).send({
        message: "Internal Server Error",
        error: "Internal Server Error",
        statusCode: 500,
      });
    }
  });

  registerRoutes(app);

  return app;
}
