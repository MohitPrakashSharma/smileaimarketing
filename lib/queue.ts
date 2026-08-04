import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env.server";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const discoveryQueue = new Queue("discovery-queue", { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
export const analysisQueue = new Queue("analysis-queue", { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
export const outreachQueue = new Queue("outreach-queue", { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
export const analysisQueue = new Queue("analysis-queue", { connection });
export const outreachQueue = new Queue("outreach-queue", { connection });
