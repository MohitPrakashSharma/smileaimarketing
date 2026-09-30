"use client";

import { AdminCard } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import Select from "@/components/ui/Select";
import { IconMegaphone } from "@/components/icons";
import { PLATFORMS, PLATFORM_LABEL } from "@/lib/social/platforms";
import { formatDateTime, sumMetric, type SocialPost, mediaUrl } from "./types";

const METRIC_HINT = "Available once the account is connected live";
const STATUS_OPTIONS = ["SCHEDULED", "PUBLISHED", "PARTIAL", "FAILED", "CANCELLED"];

function Metric({ value }: { value: number | null }) {
  return value == null ? (
    <span title={METRIC_HINT} className="cursor-help text-muted-foreground">
      —
    </span>
  ) : (
    <span className="font-semibold text-foreground">{value.toLocaleString("en-CA")}</span>
  );
}

export function PostsTable({
  posts,
  loading,
  platform,
  status,
  onPlatform,
  onStatus,
  onOpen,
}: {
  posts: SocialPost[];
  loading: boolean;
  platform: string;
  status: string;
  onPlatform: (v: string) => void;
  onStatus: (v: string) => void;
  onOpen: (post: SocialPost) => void;
}) {
  return (
    <AdminCard
      title="Post tracking"
      subtitle="Every post and where it went"
      icon={IconMegaphone}
      count={posts.length}
      action={
        <div className="hidden gap-2 sm:flex">
          <Select value={platform} onChange={(e) => onPlatform(e.target.value)} aria-label="Filter by platform" className="!h-10 !w-44 text-sm">
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Filter by status" className="!h-10 !w-44 text-sm">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      <div className="mb-4 flex gap-2 sm:hidden">
        <Select value={platform} onChange={(e) => onPlatform(e.target.value)} aria-label="Filter by platform" className="text-sm">
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Filter by status" className="text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      {loading && posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading posts…</p>
      ) : posts.length === 0 ? (
        <EmptyState
          compact={false}
          title={platform || status ? "No posts match these filters" : "No posts yet"}
          message={platform || status ? "Try a different platform or status." : "Ask the assistant above to write your first post."}
        />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Post</th>
                <th className="bg-surface-muted/70 px-3 py-3">Platforms</th>
                <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                <th className="bg-surface-muted/70 px-3 py-3">When</th>
                <th className="bg-surface-muted/70 px-3 py-3 text-right">Impr.</th>
                <th className="bg-surface-muted/70 px-3 py-3 text-right">Likes</th>
                <th className="bg-surface-muted/70 px-3 py-3 text-right">Comments</th>
                <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Shares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  onClick={() => onOpen(post)}
                  className="cursor-pointer transition-colors hover:bg-surface-muted/40"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {post.media ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated route
                        <img src={mediaUrl(post.media.id)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" />
                      ) : (
                        <span aria-hidden className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-border bg-surface-muted/60" />
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(post);
                          }}
                          className="text-left font-bold text-foreground hover:text-primary-ink hover:underline"
                        >
                          {post.topic}
                        </button>
                        <p className="text-[11px] text-muted-foreground">
                          {post.createdBy?.name ?? "Unknown"} · {formatDateTime(post.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {post.targets.map((t) => (
                        <span
                          key={t.id}
                          title={t.error ?? `${PLATFORM_LABEL[t.platform]}: ${t.status.toLowerCase()}${t.mode === "test" ? " (test mode)" : ""}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            t.status === "PUBLISHED"
                              ? "border-growth/30 bg-growth/10 text-growth-ink"
                              : t.status === "FAILED"
                                ? "border-danger/30 bg-danger/10 text-danger"
                                : t.status === "CANCELLED"
                                  ? "border-border bg-surface-muted text-muted-foreground line-through"
                                  : "border-warning/30 bg-warning/10 text-warning"
                          }`}
                        >
                          {PLATFORM_LABEL[t.platform]}
                          {t.mode === "test" && t.status === "PUBLISHED" && <span className="font-normal opacity-70">· test</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {post.status === "SCHEDULED" ? (
                      <>
                        <span className="block text-[10px] font-bold uppercase tracking-wider">Scheduled</span>
                        {formatDateTime(post.scheduledFor)}
                      </>
                    ) : post.publishedAt ? (
                      <>
                        <span className="block text-[10px] font-bold uppercase tracking-wider">Published</span>
                        {formatDateTime(post.publishedAt)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Metric value={sumMetric(post, "impressions")} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Metric value={sumMetric(post, "likes")} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Metric value={sumMetric(post, "comments")} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Metric value={sumMetric(post, "shares")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
