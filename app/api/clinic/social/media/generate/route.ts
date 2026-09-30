import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { generateImage, ImageGenError, saveMedia } from "@/lib/social/media";

// Image generation takes 15–45 s.
export const maxDuration = 120;

const schema = z.object({ prompt: z.string().trim().min(3, "Describe the image.").max(1000) });

export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid prompt" }, { status: 400 });

  try {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: auth.clinicId }, select: { name: true } });
    const image = await generateImage(parsed.data.prompt, clinic.name);
    const media = await saveMedia({
      clinicId: auth.clinicId,
      createdById: auth.userId,
      source: "AI",
      data: image.data,
      mimeType: image.mimeType,
      prompt: parsed.data.prompt,
      model: image.model,
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    console.error("Social image generation error:", err);
    const message = err instanceof ImageGenError ? err.userMessage : "Couldn't create the image. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
