import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contacts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { emailMessages: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } },
        },
        audits: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { score: true, status: true, pdfStatus: true, publicToken: true },
        },
      },
    });

    // Flattened, real, per-business summary — everything the admin overview
    // and businesses list need to act on a lead without an extra click.
    const businesses = rows.map((b) => {
      const contact = b.contacts[0];
      const audit = b.audits[0];
      return {
        id: b.id,
        name: b.name,
        website: b.website,
        city: b.city,
        state: b.state,
        country: b.country,
        status: b.status,
        opportunityScore: b.opportunityScore,
        contactCount: b.contacts.length,
        contact: contact
          ? { name: `${contact.firstName} ${contact.lastName}`, email: contact.email, phone: contact.phone, source: contact.source }
          : null,
        audit: audit ? { score: audit.score, status: audit.status, pdfStatus: audit.pdfStatus, publicToken: audit.publicToken } : null,
        outreachStatus: contact?.emailMessages[0]?.status || null,
        updatedAt: b.updatedAt,
      };
    });

    return NextResponse.json({ businesses }, { status: 200 });
  } catch (error) {
    console.error("Admin businesses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
