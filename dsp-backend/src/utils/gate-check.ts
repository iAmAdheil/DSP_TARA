import { prisma } from "../db/prisma-client.js";

export class RunCancelledError extends Error {
  constructor(runId: string) {
    super(`Run ${runId} is no longer active (failed or cancelled)`);
    this.name = "RunCancelledError";
  }
}

export async function assertRunActive(runId: string) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    select: { status: true },
  });
  if (run.status === "failed") {
    throw new RunCancelledError(runId);
  }
}
