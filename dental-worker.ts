import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

console.log("Starting Smile AI background worker daemon...");

// 1. Discovery Worker
const discoveryWorker = new Worker(
  "discovery-queue",
  async (job: Job) => {
    console.log(`[Discovery] Processing job ${job.name} (ID: ${job.id})`);
    if (job.name === "discover-businesses") {
      const { campaignId, city, category } = job.data;
      console.log(`[Discovery] Discovering ${category} clinics in ${city} for campaign ${campaignId}`);
      
      // Simulating clinic discovery by checking if we have seeded them
      const clinics = [
        { name: `${city} Dental Care Group`, website: `https://${city.toLowerCase().replace(/\s+/g, "")}dentalcare.com` },
        { name: `Apex Family Dentistry`, website: `https://apexfamilydentist${city.toLowerCase().replace(/\s+/g, "")}.com` },
        { name: `Downtown Dental Studio`, website: `https://downtowndental${city.toLowerCase().replace(/\s+/g, "")}.com` },
      ];

      for (const clinic of clinics) {
        // Upsert clinic
        await prisma.business.upsert({
          where: {
            website_city: { website: clinic.website, city },
          },
          update: { campaignId },
          create: {
            campaignId,
            name: clinic.name,
            website: clinic.website,
            city,
            category,
            status: "DISCOVERED",
          },
        });
      }
      console.log(`[Discovery] Seeded/updated 3 discovered clinics for campaign ${campaignId}`);
    }
  },
  { connection, concurrency: 1 }
);

// 2. Analysis Worker
const analysisWorker = new Worker(
  "analysis-queue",
  async (job: Job) => {
    console.log(`[Analysis] Processing job ${job.name} (ID: ${job.id})`);
    
    if (job.name === "analyse-website") {
      const { businessId, website } = job.data;
      console.log(`[Analysis] Analyzing website: ${website}`);
      // Simulate performance analysis
      const ssl = website.startsWith("https://");
      await prisma.auditResult.create({
        data: {
          auditId: job.data.auditId || "unknown",
          category: "WEBSITE_QUALITY",
          score: ssl ? 15 : 8,
          findingsJson: { ssl, speed: ssl ? "Fast" : "Slow" },
          detailsJson: {
            title: "Website Quality Audit",
            description: ssl 
              ? "Your website is secure and fast." 
              : "Your website is slow and lacks an active SSL configuration, causing patient abandonment.",
          },
        },
      });
    }

    if (job.name === "analyse-local-visibility") {
      const { businessId, name, city } = job.data;
      console.log(`[Analysis] Analyzing Maps presence for: ${name} in ${city}`);
      await prisma.auditResult.create({
        data: {
          auditId: job.data.auditId || "unknown",
          category: "LOCAL_VISIBILITY",
          score: 12,
          findingsJson: { rank: 9 },
          detailsJson: {
            title: "Maps Visibility Audit",
            description: `Your clinic ranks #9 in ${city} search results. Competitors are capturing local map pack traffic first.`,
          },
        },
      });
    }

    if (job.name === "calculate-opportunity-score") {
      const { businessId } = job.data;
      console.log(`[Analysis] Calculating opportunity score for business ID: ${businessId}`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          opportunityScore: 72,
          status: "AUDITED",
        },
      });
    }
  },
  { connection, concurrency: 2 }
);

// 3. Outreach Worker
const outreachWorker = new Worker(
  "outreach-queue",
  async (job: Job) => {
    console.log(`[Outreach] Processing job ${job.name} (ID: ${job.id})`);
    
    if (job.name === "send-email") {
      const { emailMessageId } = job.data;
      const message = await prisma.emailMessage.findUnique({
        where: { id: emailMessageId },
        include: { contact: true },
      });

      if (message) {
        console.log(`[Outreach] Simulating email dispatch to ${message.contact.email}`);
        await prisma.emailMessage.update({
          where: { id: emailMessageId },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
      }
    }
  },
  { connection, concurrency: 5 }
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down workers gracefully...");
  await discoveryWorker.close();
  await analysisWorker.close();
  await outreachWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
