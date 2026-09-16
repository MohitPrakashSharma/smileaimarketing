import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./lib/prisma";
import { Prisma } from "@prisma/client";
import { discoverBusinesses } from "./lib/discoveryProvider";
import { normalizeDomain, normalizeName } from "./lib/normalization";
import { generateLightAuditPdf } from "./lib/pdfGenerator";
import { generateV2AuditPdf } from "./lib/audit/pdf/generate";
import { sendOutreachEmail } from "./lib/email.server";
import { renderOutreachEmail } from "./lib/emailTemplate";
import { logEngagementEvent } from "./lib/events";
import { auditQueue } from "./lib/queue";
import { enrichBusinessContact } from "./lib/apollo";
import { extractWebsiteContact, isUsableContactEmail, guessContactRole } from "./lib/websiteContactExtractor";
import { initiateAutomaticOutreach } from "./lib/outreach";
import { env } from "./lib/env.server";
import { runAudit, type RunAuditOptions } from "./lib/audit/engine";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

console.log("[Smile AI Worker] Daemon starting up...");

// 1. DISCOVERY WORKER
const discoveryWorker = new Worker(
  "discovery-queue",
  async (job: Job) => {
    console.log(`[Discovery Worker] Processing job ${job.id} (${job.name})`);
    const { campaignId, city, country, state, category, maxBusinesses, dataProvider } = job.data;

    // Update campaign status
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "DISCOVERING", startedAt: new Date() },
      });
    }

    const discoveredItems = await discoverBusinesses({
      city,
      country,
      state,
      category,
      limit: maxBusinesses || 5,
      dataProvider: dataProvider || (process.env.DATA_MODE === "live" ? "GOOGLE_PLACES" : "TEST_PROVIDER"),
    });

    console.log(`[Discovery Worker] Retrieved ${discoveredItems.length} practices for ${city}`);

    let savedCount = 0;
    for (const item of discoveredItems) {
      const normDomain = normalizeDomain(item.website);
      const normName = normalizeName(item.name);

      // Check deduplication
      let existing = null;
      if (item.googlePlaceId) {
        existing = await prisma.business.findUnique({ where: { googlePlaceId: item.googlePlaceId } });
      }
      if (!existing && normDomain) {
        existing = await prisma.business.findFirst({ where: { normalizedDomain: normDomain } });
      }

      if (existing) {
        console.log(`[Discovery Worker] Business "${item.name}" already exists (${existing.id}), updating campaign relation.`);
        if (campaignId && !existing.campaignId) {
          await prisma.business.update({
            where: { id: existing.id },
            data: { campaignId },
          });
        }
        continue;
      }

      // Create new business
      const business = await prisma.business.create({
        data: {
          campaignId: campaignId || null,
          name: item.name,
          normalizedName: normName,
          website: item.website,
          normalizedDomain: normDomain,
          address: item.address,
          city: item.city,
          country: item.country || "US",
          phone: item.phone,
          category: item.category || category || "Dental Clinic",
          googlePlaceId: item.googlePlaceId || null,
          rating: item.rating || 4.5,
          reviewCount: item.reviewCount || 45,
          providerSource: item.providerSource,
          rawProviderRef: (item.rawProviderRef as Prisma.InputJsonObject) || undefined,
          status: "DISCOVERED",
          leadSource: campaignId ? "campaign_outreach" : "website_audit",
        },
      });

      // 1. Try Apollo (verified decision-maker, best when it hits)
      const apolloRes = await enrichBusinessContact(business.website);
      let contactId: string | undefined = undefined;

      if (apolloRes.found && apolloRes.email) {
        const contact = await prisma.contact.create({
          data: {
            businessId: business.id,
            firstName: apolloRes.firstName || "Practice",
            lastName: apolloRes.lastName || "Lead",
            email: apolloRes.email,
            phone: apolloRes.phone || item.phone || null,
            role: apolloRes.role || "Principal Dentist",
            source: "APOLLO",
          },
        });
        contactId = contact.id;
      } else {
        // 2. Apollo has nothing (common for small independent practices) —
        // fall back to what the practice's own website publishes.
        console.log(`[Discovery Worker] Apollo returned no verified contact for ${business.name}. Checking website directly.`);
        const siteContact = await extractWebsiteContact(business.website);

        if (siteContact.found && siteContact.email && isUsableContactEmail(siteContact.email)) {
          const contact = await prisma.contact.create({
            data: {
              businessId: business.id,
              firstName: "Practice",
              lastName: "Team",
              email: siteContact.email,
              phone: siteContact.phone || item.phone || null,
              role: guessContactRole(siteContact.email),
              source: "WEBSITE",
            },
          });
          contactId = contact.id;

          if (!business.address && siteContact.address) {
            await prisma.business.update({ where: { id: business.id }, data: { address: siteContact.address } });
          }

          console.log(`[Discovery Worker] Found contact for ${business.name} directly on their website: ${siteContact.email}`);
        } else {
          console.log(`[Discovery Worker] No usable contact found for ${business.name} via Apollo or website. Contact pending manual add.`);
        }
      }

      // Create initial Audit record
      const audit = await prisma.audit.create({
        data: {
          businessId: business.id,
          status: "PENDING",
        },
      });

      // Log discovery event
      await logEngagementEvent({
        eventType: "business_discovered",
        businessId: business.id,
        auditId: audit.id,
      });

      // Queue the audit (engine chosen by CRAWL_V2 at run time)
      await auditQueue.add(
        "run-audit",
        { auditId: audit.id, businessId: business.id, contactId, trigger: "campaign" },
        { jobId: `audit_${audit.id}` }
      );

      savedCount++;
    }

    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "PROCESSING" },
      });
    }

    console.log(`[Discovery Worker] Completed job ${job.id}. Saved ${savedCount} new businesses.`);
  },
  { connection, concurrency: 1 }
);

// 2. AUDIT WORKER — one job type for both engines (lib/audit/engine.ts).
// "analysis-queue" is kept so jobs queued by an older deploy still drain.
async function handleAuditJob(job: Job) {
  const { auditId, businessId, contactId, trigger, engine, maxPages } = job.data as { auditId?: string; businessId?: string; contactId?: string } & Partial<RunAuditOptions>;
  let targetAuditId = auditId;
  if (!targetAuditId && businessId) {
    const latest = await prisma.audit.findFirst({ where: { businessId }, orderBy: { createdAt: "desc" } });
    targetAuditId = latest?.id;
  }
  if (!targetAuditId) {
    console.error(`[Audit Worker] Job ${job.id} has no auditId.`);
    return;
  }

  const result = await runAudit(targetAuditId, { trigger: trigger ?? "campaign", engine, maxPages });
  if (!result) return; // already running/completed elsewhere

  // Fully automatic outreach for campaign-discovered businesses — unchanged
  // behaviour, now fed by whichever engine ran.
  if ((trigger ?? "campaign") === "campaign" && businessId) {
    try {
      const outreachResult = await initiateAutomaticOutreach({
        businessId,
        contactId,
        aiSubject: result.aiEmailSubject,
        aiOpening: result.aiEmailOpening,
      });
      if (outreachResult.queued) {
        console.log(`[Audit Worker] Outreach auto-queued for business ${businessId} (message ${outreachResult.emailMessageId}).`);
      } else {
        console.log(`[Audit Worker] Outreach not queued for business ${businessId}: ${outreachResult.reason}`);
      }
    } catch (err) {
      console.error(`[Audit Worker] Auto-outreach failed for business ${businessId}:`, err);
    }
  }
  console.log(`[Audit Worker] Completed audit ${targetAuditId} with ${result.engine}. Score: ${result.score}/100.`);
}

const auditWorker = new Worker("audit-queue", handleAuditJob, { connection, concurrency: 2 });
const analysisWorker = new Worker("analysis-queue", handleAuditJob, { connection, concurrency: 1 });

// 3. PDF WORKER (concurrency 1)
const pdfWorker = new Worker(
  "pdf-queue",
  async (job: Job) => {
    console.log(`[PDF Worker] Processing job ${job.id}`);
    try {
      // v2 audits get the full report PDF; V1 keeps the legacy two-page layout.
      const pdfUrl = job.data.engine === "CRAWL_V2" ? await generateV2AuditPdf(job.data.auditId, "customer") : await generateLightAuditPdf(job.data);
      console.log(`[PDF Worker] Generated PDF at ${pdfUrl} for audit ${job.data.auditId}`);
    } catch (err) {
      console.error(`[PDF Worker] Failed to generate PDF for job ${job.id}:`, err);
    }
  },
  { connection, concurrency: 1 }
);

// 4. OUTREACH WORKER
const outreachWorker = new Worker(
  "outreach-queue",
  async (job: Job) => {
    console.log(`[Outreach Worker] Processing job ${job.id} (${job.name})`);
    const { emailMessageId } = job.data;

    const message = await prisma.emailMessage.findUnique({
      where: { id: emailMessageId },
      include: {
        contact: { include: { business: { include: { audits: true } } } },
        step: true,
      },
    });

    if (!message) return;

    const business = message.contact.business;
    const audit = business.audits[0];

    if (!audit) {
      console.error(`[Outreach Worker] No audit found for business ${business.id}. Skipping send.`);
      return;
    }

    const reportUrl = `${env.APP_BASE_URL}/audit/${audit.publicToken}`;
    const pdfUrl = audit.pdfUrl ? `${env.APP_BASE_URL}${audit.pdfUrl}` : undefined;

    const rendered = renderOutreachEmail({
      subjectTemplate: message.step.subject,
      bodyTemplate: message.step.bodyTemplate,
      contactName: message.contact.firstName,
      clinicName: business.name,
      city: business.city,
      reportUrl,
      pdfUrl,
      unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe`,
    });

    const dispatchResult = await sendOutreachEmail({
      emailMessageId: message.id,
      toEmail: message.contact.email,
      toName: `${message.contact.firstName} ${message.contact.lastName}`,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    await logEngagementEvent({
      eventType: "email_sent",
      emailMessageId: message.id,
      businessId: business.id,
      auditId: audit?.id,
    });

    await prisma.business.update({
      where: { id: business.id },
      data: { status: "OUTREACH_ACTIVE" },
    });

    console.log(`[Outreach Worker] Dispatched email ${message.id} to ${dispatchResult.recipient}. Success: ${dispatchResult.success}`);
  },
  { connection, concurrency: 2 }
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Smile AI Worker] Shutting down daemon gracefully...");
  await discoveryWorker.close();
  await auditWorker.close();
  await analysisWorker.close();
  await pdfWorker.close();
  await outreachWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
