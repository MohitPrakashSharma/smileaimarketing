import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import IORedis from "ioredis";
import { discoveryQueue, analysisQueue, pdfQueue, outreachQueue } from "@/lib/queue";
import { integrationStatus } from "@/lib/env.server";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. PostgreSQL Database Status
    const dbStartTime = Date.now();
    let dbConnected = false;
    let dbLatencyMs = 0;
    let businessCount = 0;
    let campaignCount = 0;
    let auditCount = 0;

    try {
      businessCount = await prisma.business.count();
      campaignCount = await prisma.campaign.count();
      auditCount = await prisma.audit.count();
      dbLatencyMs = Date.now() - dbStartTime;
      dbConnected = true;
    } catch (err) {
      console.error("DB check error:", err);
    }

    // 1b. Google Calendar connection (separate from whether the OAuth app itself is configured)
    let connectedGoogleAccount: string | null = null;
    try {
      const token = await prisma.googleCalendarToken.findUnique({ where: { id: "default" } });
      connectedGoogleAccount = token?.googleAccountEmail || (token ? "connected" : null);
    } catch (err) {
      console.error("Google Calendar token check error:", err);
    }

    // 2. Redis & Queue Status
    let redisConnected = false;
    let redisLatencyMs = 0;
    const queueLengths = { discovery: 0, analysis: 0, pdf: 0, outreach: 0 };

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1500 });
      const redisStartTime = Date.now();
      await redis.ping();
      redisLatencyMs = Date.now() - redisStartTime;
      redisConnected = true;
      await redis.quit();

      queueLengths.discovery = await discoveryQueue.getWaitingCount();
      queueLengths.analysis = await analysisQueue.getWaitingCount();
      queueLengths.pdf = await pdfQueue.getWaitingCount();
      queueLengths.outreach = await outreachQueue.getWaitingCount();
    } catch (err) {
      console.error("Redis check error:", err);
    }

    // 3. Provider Integration States
    const integrations = [
      {
        key: "database",
        name: "PostgreSQL Database",
        status: dbConnected ? "READY" : "MISSING",
        details: dbConnected ? `Connected (${dbLatencyMs}ms) • ${businessCount} businesses, ${campaignCount} campaigns, ${auditCount} audits` : "Connection failed",
      },
      {
        key: "redis",
        name: "Redis & BullMQ Queues",
        status: redisConnected ? "READY" : "MISSING",
        details: redisConnected ? `Connected (${redisLatencyMs}ms) • Queued: Discovery (${queueLengths.discovery}), Analysis (${queueLengths.analysis}), PDF (${queueLengths.pdf}), Outreach (${queueLengths.outreach})` : "Redis server unreachable",
      },
      {
        key: "google_places",
        name: "Google Places API",
        status: integrationStatus.googlePlaces ? "READY" : "MOCKED",
        details: integrationStatus.googlePlaces ? "API key mounted • Real place discovery active" : "Key missing • Falling back to TEST_PROVIDER",
      },
      {
        key: "dataforseo",
        name: "DataForSEO API",
        status: process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD ? "READY" : "MOCKED",
        details:
          process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD
            ? "Credentials active"
            : "Login/password missing • Using deterministic fallback calculations",
      },
      {
        key: "apollo",
        name: "Apollo Contact Enrichment",
        status: process.env.APOLLO_API_KEY ? "READY" : "MOCKED",
        details: process.env.APOLLO_API_KEY ? "API key active" : "Key missing • Using local contact decision maker rules",
      },
      {
        key: "openai",
        name: "OpenAI / LLM",
        status: process.env.OPENAI_API_KEY ? "READY" : "MOCKED",
        details: process.env.OPENAI_API_KEY ? "API key mounted" : "Key missing • Using structured deterministic templates",
      },
      {
        key: "email",
        name: "Email Transport",
        status: process.env.EMAIL_SEND_MODE === "live" ? "READY" : "TEST_MODE",
        details: `Mode: ${process.env.EMAIL_SEND_MODE || "test"} • Test Recipient: ${process.env.EMAIL_TEST_RECIPIENTS || "hello@smileaimarketing.com"}`,
      },
      {
        key: "calendar",
        name: "Google Calendar & Meet",
        status: connectedGoogleAccount ? "READY" : integrationStatus.googleCalendar ? "PENDING" : "MOCKED",
        details: connectedGoogleAccount
          ? `Connected as ${connectedGoogleAccount} • Real Meet links are created on booking`
          : integrationStatus.googleCalendar
            ? 'OAuth client configured — click "Connect Google Calendar" below to authorize an account before real Meet links can be created'
            : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI missing • Using internal booking requested queue",
      },
    ];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      dbConnected,
      redisConnected,
      integrations,
    });
  } catch (error) {
    console.error("Integration status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
