import { Queue, FlowProducer } from "bullmq";
import { redisConnection } from "./redis-connection.js";
import { QueueNames } from "./queue-names.js";

export const runPipelineQueue = new Queue(QueueNames.runPipeline, {
  connection: redisConnection,
});

export const threatsQueue = new Queue(QueueNames.threatsGeneration, {
  connection: redisConnection,
});

export const cvesQueue = new Queue(QueueNames.cveMatching, {
  connection: redisConnection,
});

export const attackPathsQueue = new Queue(QueueNames.attackPaths, {
  connection: redisConnection,
});

export const riskScoringQueue = new Queue(QueueNames.riskScoring, {
  connection: redisConnection,
});

export const mitigationsQueue = new Queue(QueueNames.mitigations, {
  connection: redisConnection,
});

export const exportQueue = new Queue(QueueNames.exportGeneration, {
  connection: redisConnection,
});

export const flowProducer = new FlowProducer({ connection: redisConnection });
