import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendOutreachEmail } from "@/lib/email.server";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const recipientEmail = body.recipientEmail || "dr.jenkins@apexfamilydentistrychicago.com";

    const result = await sendOutreachEmail({
      toEmail: recipientEmail,
      toName: "Dr. Sarah Jenkins",
      subject: "Test Audit Executive Findings - Smile AI Marketing",
      bodyHtml: `
        <h2>Dental Visibility & Conversion Audit Summary</h2>
        <p>This is a test mode email dispatch for practice lead audit reports.</p>
      `,
      reportUrl: "https://smileaimarketing.com/audit/demo-token",
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Admin test email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
