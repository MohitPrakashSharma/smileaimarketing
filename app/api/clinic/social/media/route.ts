import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, saveMedia, sniffImageType } from "@/lib/social/media";

/** Upload the clinic's own photo (multipart form field "file"). */
export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffImageType(data);
  if (!mimeType || !ALLOWED_TYPES[mimeType]) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  }

  try {
    const media = await saveMedia({
      clinicId: auth.clinicId,
      createdById: auth.userId,
      source: "UPLOAD",
      data,
      mimeType,
      fileName: file.name.slice(0, 200),
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    console.error("Social image upload error:", err);
    return NextResponse.json({ error: "Couldn't save the image." }, { status: 500 });
  }
}
