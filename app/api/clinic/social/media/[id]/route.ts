import fs from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { mediaFilePath } from "@/lib/social/media";

/** Serves an image to signed-in users of the clinic that owns it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const media = await prisma.socialMedia.findFirst({ where: { id, clinicId: auth.clinicId } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await fs.readFile(mediaFilePath(media.path));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(data.length),
        // Files never change once written.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file is missing" }, { status: 404 });
  }
}
