import type { FastifyInstance } from "fastify";

// Ingestion is handled internally by the orchestrator worker.
// No HTTP routes needed — this module exists for the worker logic only.
export function registerIngestionRoutes(_app: FastifyInstance) {
  // no-op
}
