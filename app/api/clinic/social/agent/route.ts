import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { agentErrorMessage, runSocialAgent } from "@/lib/social/agent";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30),
});

/** One chat turn with the social media agent. The conversation lives in the browser; nothing is stored. */
export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });

  const clinic = await prisma.clinic.findUnique({
    where: { id: auth.clinicId },
    select: { name: true, city: true, province: true, website: true },
  });
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  try {
    const turn = await runSocialAgent(clinic, parsed.data.messages.slice(-20));
    return NextResponse.json(turn);
  } catch (err) {
    console.error("Social agent error:", err);
    return NextResponse.json({ error: agentErrorMessage(err) }, { status: 502 });
  }
}
