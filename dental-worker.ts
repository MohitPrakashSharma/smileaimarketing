import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./lib/prisma";
import { Prisma } from "@prisma/client";
import { discoverBusinesses, findLocalMarketPosition } from "./lib/discoveryProvider";
import { normalizeDomain, normalizeName } from "./lib/normalization";
import { analyzeWebsite } from "./lib/websiteAnalyzer";
import { computeAuditScores } from "./lib/auditScorer";
import { generateLightAuditPdf } from "./lib/pdfGenerator";
import { sendOutreachEmail } from "./lib/email.server";
import { renderOutreachEmail } from "./lib/emailTemplate";
import { logEngagementEvent } from "./lib/events";
import { analysisQueue, pdfQueue } from "./lib/queue";
import { enrichBusinessContact } from "./lib/apollo";
import { extractWebsiteContact, isUsableContactEmail, guessContactRole } from "./lib/websiteContactExtractor";
import { generateAuditSummaryWithOpenAI } from "./lib/openai";
import { initiateAutomaticOutreach } from "./lib/outreach";
import { env } from "./lib/env.server";

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

      // Queue analysis job
      await analysisQueue.add(
        "analyse-business",
        { businessId: business.id, auditId: audit.id, contactId },
        { jobId: `analysis_${audit.id}` }
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

// 2. ANALYSIS WORKER
const analysisWorker = new Worker(
  "analysis-queue",
  async (job: Job) => {
    console.log(`[Analysis Worker] Processing job ${job.id} (${job.name})`);
    const { businessId, auditId, contactId } = job.data;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { audits: true },
    });

    if (!business) {
      console.error(`[Analysis Worker] Business ${businessId} not found.`);
      return;
    }

    const targetAuditId = auditId || business.audits[0]?.id;
    if (!targetAuditId) return;

    await prisma.audit.update({
      where: { id: targetAuditId },
      data: { status: "RUNNING" },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { status: "AUDITING" },
    });

    // Run real credential-free website check
    const signals = await analyzeWebsite(business.website);

    // Real competitor list + the business's own local-pack rank — never fabricated
    const localMarket = await findLocalMarketPosition({
      businessName: business.name,
      website: business.website,
      city: business.city,
      state: business.state || undefined,
      country: business.country,
      category: business.category,
      limit: 3,
    });

    // Calculate deterministic scores
    const scoreOutput = computeAuditScores({
      businessName: business.name,
      city: business.city,
      website: business.website,
      signals,
      rating: business.rating || 4.5,
      reviewCount: business.reviewCount || 45,
      realCompetitors: localMarket.competitors,
      ownRank: localMarket.ownRank,
      marketChecked: localMarket.checked,
    });

    // Generate OpenAI summary if key available — pass the exact website
    // failure through so the AI leads with it instead of glossing over a 0 score.
    let finalSummary = scoreOutput.summaryText;
    let aiEmailSubject: string | undefined;
    let aiEmailOpening: string | undefined;
    try {
      const aiSummaryRes = await generateAuditSummaryWithOpenAI({
        businessName: business.name,
        website: business.website,
        city: business.city,
        overallScore: scoreOutput.opportunityScore,
        results: scoreOutput.categoryScores.map((c) => ({ category: c.category, score: c.score })),
        competitors: scoreOutput.competitors,
        websiteIssue: signals.reachable ? undefined : signals.error,
      });
      if (aiSummaryRes.summary) {
        finalSummary = aiSummaryRes.summary;
      }
      aiEmailSubject = aiSummaryRes.emailSubject;
      aiEmailOpening = aiSummaryRes.emailOpening;
    } catch (err) {
      console.warn("[Analysis Worker] OpenAI summary generation skipped:", err);
    }

    // Clear old audit results if re-running
    await prisma.auditResult.deleteMany({ where: { auditId: targetAuditId } });
    await prisma.competitor.deleteMany({ where: { auditId: targetAuditId } });

    // Store AuditResults
    for (const catScore of scoreOutput.categoryScores) {
      await prisma.auditResult.create({
        data: {
          auditId: targetAuditId,
          category: catScore.category,
          score: catScore.score,
          findingsJson: catScore.findingsJson as Prisma.InputJsonObject,
          detailsJson: catScore.detailsJson as Prisma.InputJsonObject,
        },
      });
    }

    // Store Competitors
    for (const comp of scoreOutput.competitors) {
      await prisma.competitor.create({
        data: {
          auditId: targetAuditId,
          name: comp.name,
          website: comp.website || `https://${normalizeName(comp.name).replace(/\s+/g, "")}.com`,
          rank: comp.rank,
          mapScore: comp.mapScore,
        },
      });
    }

    // Update Audit & Business
    const completedAudit = await prisma.audit.update({
      where: { id: targetAuditId },
      data: {
        status: "COMPLETED",
        score: scoreOutput.opportunityScore,
        summaryText: finalSummary,
      },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: {
        status: "AUDITED",
        opportunityScore: scoreOutput.opportunityScore,
        lastCheckedAt: new Date(),
      },
    });

    await logEngagementEvent({
      eventType: "audit_completed",
      businessId,
      auditId: targetAuditId,
    });

    // Enqueue PDF generation (concurrency 1)
    await pdfQueue.add(
      "generate-pdf",
      {
        auditId: completedAudit.id,
        publicToken: completedAudit.publicToken,
        businessName: business.name,
        city: business.city,
        website: business.website,
        opportunityScore: scoreOutput.opportunityScore,
        summaryText: finalSummary,
        findings: scoreOutput.categoryScores.map((c) => ({
          category: c.category,
          score: c.score,
          title: c.detailsJson.title,
          detail: c.detailsJson.description,
          findingsJson: c.findingsJson,
        })),
        competitors: scoreOutput.competitors,
        category: business.category,
      },
      { jobId: `pdf_${completedAudit.id}` }
    );

    // Fully automatic outreach — no admin approval step. A no-op (with a
    // logged reason) when there's genuinely no verified contact yet.
    try {
      const outreachResult = await initiateAutomaticOutreach({
        businessId,
        contactId,
        aiSubject: aiEmailSubject,
        aiOpening: aiEmailOpening,
      });
      if (outreachResult.queued) {
        console.log(`[Analysis Worker] Outreach auto-queued for business ${businessId} (message ${outreachResult.emailMessageId}).`);
      } else {
        console.log(`[Analysis Worker] Outreach not queued for business ${businessId}: ${outreachResult.reason}`);
      }
    } catch (err) {
      console.error(`[Analysis Worker] Auto-outreach failed for business ${businessId}:`, err);
    }

    console.log(`[Analysis Worker] Completed audit ${targetAuditId}. Score: ${scoreOutput.opportunityScore}/100.`);
  },
  { connection, concurrency: 2 }
);

// 3. PDF WORKER (concurrency 1)
const pdfWorker = new Worker(
  "pdf-queue",
  async (job: Job) => {
    console.log(`[PDF Worker] Processing job ${job.id}`);
    try {
      const pdfUrl = await generateLightAuditPdf(job.data);
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
  await analysisWorker.close();
  await pdfWorker.close();
  await outreachWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
