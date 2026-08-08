import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const unsubscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = unsubscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const { email } = result.data;
    const domain = email.split("@")[1] || null;

    // Create or find suppression record
    await prisma.suppressionRecord.upsert({
      where: { email },
      update: {},
      create: {
        email,
        domain,
        reason: "User unsubscribed via public form",
      },
    });

    // Find contacts associated with this email
    const contacts = await prisma.contact.findMany({
      where: { email },
    });

    if (contacts.length > 0) {
      const contactIds = contacts.map((c) => c.id);

      // Cancel/delete any queued email messages
      await prisma.emailMessage.deleteMany({
        where: {
          contactId: { in: contactIds },
          status: "QUEUED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Suppression list updated.",
    }, { status: 200 });
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
