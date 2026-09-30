import fs from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaFilePath, toJpeg } from "@/lib/social/media";
import { verifyMediaToken } from "@/lib/social/secrets";

/*
 * Public, signed, expiring link to one post image. Instagram's API downloads
 * the image from a URL, so it can't use the signed-in clinic route. Always
 * served as JPEG, which is what Instagram accepts.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const mediaId = verifyMediaToken(token.replace(/\.jpg$/, ""));
  if (!mediaId) return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });

  const media = await prisma.socialMedia.findUnique({ where: { id: mediaId } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const jpeg = await toJpeg(await fs.readFile(mediaFilePath(media.path)), media.mimeType);
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpeg.length),
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file is missing" }, { status: 404 });
  }
}
