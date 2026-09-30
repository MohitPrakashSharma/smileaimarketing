import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { PLATFORMS } from "@/lib/social/platforms";
import { postInclude } from "@/lib/social/serialize";
import { publishPost, schedulePost } from "@/lib/social/service";

const STATUSES = ["SCHEDULED", "PUBLISHING", "PUBLISHED", "PARTIAL", "FAILED", "CANCELLED"] as const;

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;

  const params = new URL(request.url).searchParams;
  const platform = params.get("platform");
  const status = params.get("status");

  const where: Prisma.SocialPostWhereInput = { clinicId: auth.clinicId };
  if (platform && (PLATFORMS as readonly string[]).includes(platform)) {
    where.targets = { some: { platform: platform as (typeof PLATFORMS)[number] } };
  }
  if (status && (STATUSES as readonly string[]).includes(status)) where.status = status as (typeof STATUSES)[number];

  const posts = await prisma.socialPost.findMany({ where, include: postInclude, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ posts });
}

const createSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  request: z.string().trim().max(4000).optional(),
  caption: z.string().trim().min(1).max(5000),
  hashtags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  targets: z
    .array(z.object({ platform: z.enum(PLATFORMS), caption: z.string().trim().min(1, "A caption is empty.").max(5000) }))
    .min(1, "Choose at least one platform."),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  mediaId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post" }, { status: 400 });
  }
  const data = parsed.data;
  const platforms = new Set(data.targets.map((t) => t.platform));
  if (platforms.size !== data.targets.length) {
    return NextResponse.json({ error: "Each platform can only be chosen once." }, { status: 400 });
  }

  if (data.mediaId) {
    const media = await prisma.socialMedia.findFirst({ where: { id: data.mediaId, clinicId: auth.clinicId }, select: { id: true } });
    if (!media) return NextResponse.json({ error: "That image couldn't be found. Add it again." }, { status: 400 });
  } else if (platforms.has("INSTAGRAM")) {
    return NextResponse.json({ error: "Instagram posts need an image. Add one, or untick Instagram." }, { status: 400 });
  }

  const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
  if (scheduledFor && scheduledFor.getTime() < Date.now() + 30_000) {
    return NextResponse.json({ error: "Pick a time at least a minute from now, or publish now." }, { status: 400 });
  }

  const post = await prisma.socialPost.create({
    data: {
      clinicId: auth.clinicId,
      createdById: auth.userId,
      topic: data.topic,
      request: data.request,
      caption: data.caption,
      hashtags: data.hashtags.map((h) => h.replace(/^#/, "")),
      status: scheduledFor ? "SCHEDULED" : "PUBLISHING",
      scheduledFor,
      mediaId: data.mediaId,
      targets: { create: data.targets.map((t) => ({ platform: t.platform, caption: t.caption })) },
    },
  });

  try {
    if (scheduledFor) await schedulePost(post.id, scheduledFor);
    else await publishPost(post.id);
  } catch (err) {
    console.error("Social publish/schedule error:", err);
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "FAILED" } });
    await prisma.socialPostTarget.updateMany({
      where: { postId: post.id, status: "PENDING" },
      data: { status: "FAILED", error: scheduledFor ? "Couldn't schedule the post." : "Publishing failed unexpectedly." },
    });
  }

  const full = await prisma.socialPost.findUnique({ where: { id: post.id }, include: postInclude });
  return NextResponse.json({ post: full }, { status: 201 });
}
