import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const discoveryQueue = new Queue("discovery-queue", { connection });
export const analysisQueue = new Queue("analysis-queue", { connection });
export const outreachQueue = new Queue("outreach-queue", { connection });
