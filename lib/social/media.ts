import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { SocialMediaSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/*
 * Images for social posts: AI-generated (OpenAI Images API) or uploaded.
 * Files are written to storage/social/<clinicId>/<id>.<ext> (git-ignored,
 * override with SOCIAL_MEDIA_DIR) and served only through the clinic-scoped
 * /api/clinic/social/media/[id] route.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function storageRoot() {
  return process.env.SOCIAL_MEDIA_DIR || path.join(process.cwd(), "storage", "social");
}

export function mediaFilePath(relative: string) {
  const root = storageRoot();
  const full = path.resolve(root, relative);
  if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid media path");
  return full;
}

/** Checks the file's magic bytes rather than trusting the browser's content type. */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function saveMedia(input: {
  clinicId: string;
  createdById: string;
  source: SocialMediaSource;
  data: Buffer;
  mimeType: string;
  prompt?: string;
  model?: string;
  fileName?: string;
}) {
  const ext = ALLOWED_TYPES[input.mimeType];
  if (!ext) throw new Error(`Unsupported image type ${input.mimeType}`);
  const id = crypto.randomUUID();
  const relative = `${input.clinicId}/${id}.${ext}`;
  const full = mediaFilePath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, input.data);

  return prisma.socialMedia.create({
    data: {
      id,
      clinicId: input.clinicId,
      createdById: input.createdById,
      source: input.source,
      prompt: input.prompt,
      model: input.model,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      path: relative,
    },
    select: mediaSelect,
  });
}

export const mediaSelect = { id: true, source: true, prompt: true, mimeType: true, createdAt: true } as const;

export class ImageGenError extends Error {
  constructor(message: string, public userMessage: string) {
    super(message);
    this.name = "ImageGenError";
  }
}

/*
 * Every image gets the same house style so a clinic's feed looks consistent,
 * and the guard rails image models need: no lettering (it comes out
 * misspelled), no identifiable patients, nothing clinical or graphic.
 */
function buildImagePrompt(subject: string, clinicName: string) {
  return [
    `Square social media image for ${clinicName}, a friendly modern dental clinic.`,
    `Subject: ${subject}`,
    "Style: bright, clean, natural light, soft clinic colours (white, soft blue, light teal), warm and reassuring, professional photography look.",
    "Do not include any text, letters, words, logos or watermarks.",
    "No blood, no open-mouth close-ups of teeth, no dental procedures in progress, nothing that could look alarming.",
  ].join("\n");
}

type ImageParams = { size?: string; quality?: string; output_format?: string; n?: number };

/** Generates one image with the OpenAI Images API and returns its bytes. */
export async function generateImage(subject: string, clinicName: string): Promise<{ data: Buffer; mimeType: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  if (!apiKey) throw new ImageGenError("OPENAI_API_KEY is not configured", "Image generation isn't set up yet (no OpenAI key).");

  const params: ImageParams = { n: 1, size: "1024x1024", quality: "medium", output_format: "jpeg" };
  const prompt = buildImagePrompt(subject, clinicName);

  // Same negotiation as the chat client: drop a parameter the model rejects, retry once per parameter.
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, ...params }),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as Error).name === "AbortError";
      throw new ImageGenError(aborted ? "Image request timed out" : (err as Error).message, aborted ? "The image took too long. Try again." : "Couldn't reach the image service. Try again.");
    } finally {
      clearTimeout(timer);
    }

    const body = (await res.json().catch(() => null)) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message?: string; code?: string; param?: string };
    } | null;

    if (!res.ok) {
      const message = body?.error?.message ?? `HTTP ${res.status}`;
      const unsupported = message.match(/Unknown parameter: '([a-z_]+)'|Unsupported (?:parameter|value): '([a-z_]+)'/i);
      const key = (unsupported?.[1] || unsupported?.[2] || body?.error?.param) as keyof ImageParams | undefined;
      if (res.status === 400 && key && key in params) {
        delete params[key];
        continue;
      }
      if (body?.error?.code === "moderation_blocked" || /safety system|content policy/i.test(message)) {
        throw new ImageGenError(message, "The image service declined that description. Try describing the image differently.");
      }
      if (res.status === 429) throw new ImageGenError(message, "The image service is busy. Try again in a minute.");
      throw new ImageGenError(`OpenAI image error ${res.status}: ${message}`, "Couldn't create the image. Try again.");
    }

    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) throw new ImageGenError("OpenAI returned no image data", "Couldn't create the image. Try again.");
    const data = Buffer.from(b64, "base64");
    const mimeType = sniffImageType(data);
    if (!mimeType) throw new ImageGenError("OpenAI returned an unrecognised image format", "Couldn't create the image. Try again.");
    return { data, mimeType, model };
  }
  throw new ImageGenError("Image request could not be negotiated", "Couldn't create the image. Try again.");
}

/** Instagram only takes JPEG; AI images already are, uploads may be PNG/WebP. */
export async function toJpeg(data: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === "image/jpeg") return data;
  const sharp = (await import("sharp")).default;
  return sharp(data).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
}

export async function readMediaFile(media: { path: string }) {
  return fs.readFile(mediaFilePath(media.path));
}
