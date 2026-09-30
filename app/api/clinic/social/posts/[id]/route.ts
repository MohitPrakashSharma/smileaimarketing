import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { postInclude } from "@/lib/social/serialize";
import { publishPost, unschedulePost } from "@/lib/social/service";
import { syncMetrics } from "@/lib/social/metrics";

type Ctx = { params: Promise<{ id: string }> };

async function findPost(clinicId: string, id: string) {
  return prisma.socialPost.findFirst({ where: { id, clinicId }, include: postInclude });
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  const post = await findPost(auth.clinicId, (await params).id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post });
}

const patchSchema = z.object({ action: z.enum(["cancel", "retry", "refresh"]) });

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const post = await findPost(auth.clinicId, (await params).id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (parsed.data.action === "refresh") {
    await syncMetrics({ postId: post.id });
  } else if (parsed.data.action === "cancel") {
    if (post.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only scheduled posts can be cancelled." }, { status: 409 });
    }
    await unschedulePost(post.id);
    await prisma.$transaction([
      prisma.socialPostTarget.updateMany({ where: { postId: post.id, status: "PENDING" }, data: { status: "CANCELLED" } }),
      prisma.socialPost.update({ where: { id: post.id }, data: { status: "CANCELLED" } }),
    ]);
  } else {
    const failed = post.targets.filter((t) => t.status === "FAILED");
    if (!failed.length) return NextResponse.json({ error: "Nothing to retry — no platform failed." }, { status: 409 });
    await prisma.socialPostTarget.updateMany({
      where: { postId: post.id, status: "FAILED" },
      data: { status: "PENDING", error: null },
    });
    await publishPost(post.id);
  }

  return NextResponse.json({ post: await findPost(auth.clinicId, post.id) });
}
