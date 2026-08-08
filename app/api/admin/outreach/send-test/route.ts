import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendOutreachEmail } from "@/lib/email.server";
import { renderOutreachEmail } from "@/lib/emailTemplate";
import { env } from "@/lib/env.server";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const recipientEmail = body.recipientEmail || env.EMAIL_TEST_RECIPIENTS.split(",")[0].trim();

    const rendered = renderOutreachEmail({
      subjectTemplate: "Patient visibility opportunity gap for {{clinicName}}",
      bodyTemplate:
        "Hi {{contactName}},\n\nWe recently ran a free growth audit for a practice like yours in {{city}} — this is a sample of what that report and follow-up email looks like.\n\nA real send will reference the specific gaps we found on your Google visibility, website, and booking experience.",
      contactName: "Dr. Jenkins",
      clinicName: "Sample Dental Practice",
      city: "your city",
      reportUrl: `${env.APP_BASE_URL}/free-dental-audit`,
      unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe`,
    });

    const result = await sendOutreachEmail({
      toEmail: recipientEmail,
      toName: "Test Recipient",
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Admin test email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
