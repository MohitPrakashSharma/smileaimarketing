import type { SocialPostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishToPlatform } from "./publishers";

export const SOCIAL_PUBLISH_JOB = "publish-social-post";

/** Overall post status from its targets (cancelled targets don't count). */
function rollUp(statuses: string[]): SocialPostStatus {
  const live = statuses.filter((s) => s !== "CANCELLED");
  if (live.length === 0) return "CANCELLED";
  if (live.some((s) => s === "PENDING")) return "PUBLISHING";
  const ok = live.filter((s) => s === "PUBLISHED").length;
  if (ok === live.length) return "PUBLISHED";
  if (ok === 0) return "FAILED";
  return "PARTIAL";
}

/**
 * Publishes every PENDING target of a post and rolls the result up onto the
 * post. Safe to call twice: only PENDING targets are attempted, and a
 * cancelled post is left alone.
 */
export async function publishPost(postId: string) {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { clinic: { select: { id: true, name: true } }, targets: true, media: { select: { id: true, path: true, mimeType: true } } },
  });
  if (!post || post.status === "CANCELLED") return null;

  const pending = post.targets.filter((t) => t.status === "PENDING");
  if (pending.length) {
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });
  }

  for (const target of pending) {
    let result;
    try {
      result = await publishToPlatform(target, { clinicId: post.clinic.id, clinicName: post.clinic.name, media: post.media });
    } catch (err) {
      result = { ok: false as const, mode: "test" as const, error: err instanceof Error ? err.message : "Publish failed" };
    }
    await prisma.socialPostTarget.update({
      where: { id: target.id },
      data: result.ok
        ? { status: "PUBLISHED", mode: result.mode, externalId: result.externalId, externalUrl: result.externalUrl ?? null, publishedAt: new Date(), error: null }
        : { status: "FAILED", mode: result.mode, error: result.error },
    });
  }

  const targets = await prisma.socialPostTarget.findMany({ where: { postId: post.id }, select: { status: true, publishedAt: true } });
  const status = rollUp(targets.map((t) => t.status));
  const firstPublished = targets
    .map((t) => t.publishedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return prisma.socialPost.update({
    where: { id: post.id },
    data: { status, publishedAt: firstPublished ?? null },
  });
}

/** Queues a delayed publish job; the job id is the post id so a post is never queued twice. */
export async function schedulePost(postId: string, when: Date) {
  const { socialQueue } = await import("@/lib/queue");
  const existing = await socialQueue.getJob(postId);
  if (existing) await existing.remove().catch(() => {});
  await socialQueue.add(SOCIAL_PUBLISH_JOB, { postId }, { jobId: postId, delay: Math.max(0, when.getTime() - Date.now()) });
}

export async function unschedulePost(postId: string) {
  const { socialQueue } = await import("@/lib/queue");
  const job = await socialQueue.getJob(postId);
  if (job) await job.remove().catch(() => {});
}
