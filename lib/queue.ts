import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env.server";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const discoveryQueue = new Queue("discovery-queue", { connection, defaultJobOptions });
export const analysisQueue = new Queue("analysis-queue", { connection, defaultJobOptions });
export const pdfQueue = new Queue("pdf-queue", { connection, defaultJobOptions });
export const outreachQueue = new Queue("outreach-queue", { connection, defaultJobOptions });
