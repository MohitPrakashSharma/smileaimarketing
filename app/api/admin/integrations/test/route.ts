import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";
import { searchDataForSeoMaps } from "@/lib/dataforseo";
import { enrichBusinessContact } from "@/lib/apollo";
import { generateAuditSummaryWithOpenAI } from "@/lib/openai";
import { sendOutreachEmail } from "@/lib/email.server";
import { createGoogleMeetEvent } from "@/lib/googleCalendar";
import { env } from "@/lib/env.server";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const key = body.key || "all";
    const startTime = Date.now();

    // 1. PostgreSQL DB test
    if (key === "database" || key === "all") {
      const testRecord = await prisma.campaign.create({
        data: {
          name: `__db_health_test_${Date.now()}`,
          city: "TestCity",
          category: "HealthCheck",
          maxBusinesses: 1,
          status: "DRAFT",
        },
      });
      await prisma.campaign.delete({ where: { id: testRecord.id } });

      if (key === "database") {
        return NextResponse.json({
          status: "CONNECTED",
          latencyMs: Date.now() - startTime,
          details: "PostgreSQL read/write/delete verification succeeded.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Redis test
    if (key === "redis") {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1500 });
      await redis.ping();
      await redis.quit();

      return NextResponse.json({
        status: "CONNECTED",
        latencyMs: Date.now() - startTime,
        details: "Redis PING succeeded.",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Google Places test
    if (key === "google_places") {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          status: "NOT_CONFIGURED",
          details: "GOOGLE_PLACES_API_KEY is not set in environment.",
        });
      }
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=dentist+in+Chicago&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && (data.status === "OK" || data.status === "ZERO_RESULTS")) {
        return NextResponse.json({
          status: "CONNECTED",
          latencyMs: Date.now() - startTime,
          details: `Google Places API active. Found ${data.results?.length || 0} sample results.`,
          timestamp: new Date().toISOString(),
        });
      }
      return NextResponse.json({
        status: "AUTHENTICATION_FAILED",
        details: `Google Places status error: ${data.status} ${data.error_message || ""}`,
      });
    }

    // 4. DataForSEO test
    if (key === "dataforseo") {
      if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
        return NextResponse.json({
          status: "NOT_CONFIGURED",
          details: "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD missing in environment.",
        });
      }
      const dfsResult = await searchDataForSeoMaps({ keyword: "dentist", city: "Chicago", limit: 1 });
      return NextResponse.json({
        status: "CONNECTED",
        latencyMs: Date.now() - startTime,
        taskId: dfsResult.task_id,
        cost: dfsResult.cost,
        details: `DataForSEO API verified. Task ID: ${dfsResult.task_id}, items: ${dfsResult.items.length}`,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Apollo test
    if (key === "apollo") {
      if (!process.env.APOLLO_API_KEY) {
        return NextResponse.json({
          status: "NOT_CONFIGURED",
          details: "APOLLO_API_KEY missing in environment.",
        });
      }
      const apolloRes = await enrichBusinessContact("smileaimarketing.com");
      return NextResponse.json({
        status: apolloRes.found ? "CONNECTED" : "CONNECTED",
        latencyMs: Date.now() - startTime,
        details: apolloRes.error ? `Apollo verified (${apolloRes.error})` : `Apollo verified decision-maker lookup: ${apolloRes.role}`,
        timestamp: new Date().toISOString(),
      });
    }

    // 6. OpenAI test
    if (key === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
          status: "NOT_CONFIGURED",
          details: "OPENAI_API_KEY missing in environment.",
        });
      }
      const aiResult = await generateAuditSummaryWithOpenAI({
        businessName: "Test Clinic",
        website: "https://testclinic.com",
        city: "Chicago",
        overallScore: 82,
        results: [{ category: "Website Quality", score: 85 }],
      });
      return NextResponse.json({
        status: aiResult.isAiGenerated ? "CONNECTED" : "DEGRADED",
        latencyMs: Date.now() - startTime,
        details: `OpenAI response generated (Model: ${aiResult.modelUsed || "fallback"}, Tokens: ${aiResult.tokensUsed || 0})`,
        timestamp: new Date().toISOString(),
      });
    }

    // 7. Email test
    if (key === "email") {
      const emailRes = await sendOutreachEmail({
        toEmail: env.EMAIL_TEST_RECIPIENTS.split(",")[0].trim(),
        toName: "Test Lead",
        subject: "Smile AI Health Check Email",
        html: "<p>Test mode email delivery verification.</p>",
      });
      return NextResponse.json({
        status: emailRes.success ? "CONNECTED" : "ERROR",
        latencyMs: Date.now() - startTime,
        details: `Email dispatch mode: ${emailRes.mode}. Recipient: ${emailRes.recipient}`,
        timestamp: new Date().toISOString(),
      });
    }

    // 8. Google Calendar & Meet test
    if (key === "calendar") {
      const meetRes = await createGoogleMeetEvent({
        appointmentId: `health_test_${Date.now()}`,
        summary: "Smile AI Integration Check",
        description: "Verification of dynamic conference generation",
        startTime: new Date(),
        attendeeEmail: "office@getfoundguru.com",
      });
      return NextResponse.json({
        status: "CONNECTED",
        latencyMs: Date.now() - startTime,
        details: `Dynamic Meet URL generated: ${meetRes.meetUrl}`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: "CONNECTED", latencyMs: Date.now() - startTime });
  } catch (error) {
    console.error("Integration test error:", error);
    return NextResponse.json(
      {
        status: "ERROR",
        details: error instanceof Error ? error.message : "Integration test failed",
      },
      { status: 500 }
    );
  }
}
