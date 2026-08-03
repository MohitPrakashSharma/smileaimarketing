import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inboundSchema = z.object({
  website: z.string().url(),
  city: z.string().min(2),
  clinicName: z.string().min(2),
  country: z.string().default("US"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = inboundSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid inputs" }, { status: 400 });
    }

    const { website, city, clinicName, country } = result.data;

    // Check if the business already exists in this city
    let business = await prisma.business.findUnique({
      where: {
        website_city: { website, city },
      },
    });

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: clinicName,
          website,
          city,
          country,
          category: "Dental Clinic",
          status: "AUDITING",
        },
      });
    } else {
      // Update status to Auditing if it already exists
      business = await prisma.business.update({
        where: { id: business.id },
        data: { status: "AUDITING" },
      });
    }

    // Create a pending Audit record
    const audit = await prisma.audit.create({
      data: {
        businessId: business.id,
        status: "PENDING",
        score: 0,
      },
    });

    // Run quick deterministic mock checks
    const sslValid = website.startsWith("https://");
    const pageSpeedEstimate = sslValid ? "MOBILE_SLOW" : "MOBILE_CRITICAL";
    const mobileOptimized = sslValid;

    return NextResponse.json({
      pendingAuditId: audit.id,
      preliminaryFindings: {
        sslValid,
        pageSpeedEstimate,
        mobileOptimized,
      },
    }, { status: 202 });
  } catch (error) {
    console.error("Inbound trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
