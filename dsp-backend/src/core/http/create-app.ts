import Fastify from "fastify";
// FastifyError is only exported as a type from fastify
// Import it from @fastify/error for runtime checks with instanceof
// Make sure version 4.2.0 or higher is used across your dependency tree
import { FastifyError } from '@fastify/error'

import { registerRoutes } from "./route-registry.js";

export function createApp() {
  const app = Fastify({ logger: true });

  app.setErrorHandler(function (err, req, reply) {
    if (err instanceof FastifyError) {
      if (err.code === 'FST_ERR_TEST') {
        req.log.error({ err }, "request failed");
        reply.status(err.statusCode || 500).send({ ok: false, error: { code: "INTERNAL", message: err.message } });
      }
    } else {
      // Handle other error shapes safely
      reply.code(500).send({
        message: 'Internal Server Error',
        error: 'Internal Server Error',
        statusCode: 500
      })
    }
  })

  registerRoutes(app);

  return app;
}
