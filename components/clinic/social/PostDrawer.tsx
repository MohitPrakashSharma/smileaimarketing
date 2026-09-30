"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import { IconClose } from "@/components/icons";
import { PLATFORM_LABEL } from "@/lib/social/platforms";
import { formatDateTime, mediaUrl, type SocialPost } from "./types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{children}</span>
    </div>
  );
}

export function PostDrawer({ post, onClose, onChange }: { post: SocialPost; onClose: () => void; onChange: (post: SocialPost) => void }) {
  const [busy, setBusy] = useState<"cancel" | "retry" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = async (action: "cancel" | "retry") => {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/clinic/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      onChange(data.post);
      setConfirmCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const hasFailed = post.targets.some((t) => t.status === "FAILED");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="post-drawer-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside className="animate-fade-in absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="post-drawer-title" className="truncate font-display text-lg font-semibold text-foreground">
              {post.topic}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {post.createdBy?.name ?? "Unknown"} · {formatDateTime(post.createdAt)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {post.media ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated route */}
              <img src={mediaUrl(post.media.id)} alt={post.media.prompt ?? post.topic} className="aspect-square w-full rounded-xl border border-border object-cover" />
              <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
                {post.media.source === "AI" ? "AI-generated image" : "Uploaded photo"} · used on every platform
              </figcaption>
            </figure>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">No image on this post.</p>
          )}

          <div className="space-y-2 rounded-xl bg-surface-muted/60 p-4">
            <Row label="Status">
              <StatusBadge status={post.status} />
            </Row>
            {post.scheduledFor && <Row label="Scheduled for">{formatDateTime(post.scheduledFor)}</Row>}
            <Row label="Published">{formatDateTime(post.publishedAt)}</Row>
            {post.request && <Row label="Requested as">“{post.request}”</Row>}
          </div>

          {post.targets.map((t) => (
            <section key={t.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{PLATFORM_LABEL[t.platform]}</h3>
                <div className="flex items-center gap-2">
                  {t.mode === "test" && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test</span>
                  )}
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{t.caption}</p>
              <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                <Row label="Published at">{formatDateTime(t.publishedAt)}</Row>
                <Row label="Post ID">{t.externalId ?? "—"}</Row>
                {t.externalUrl && (
                  <Row label="Link">
                    <a href={t.externalUrl} target="_blank" rel="noreferrer" className="text-primary-ink underline">
                      View post
                    </a>
                  </Row>
                )}
                <Row label="Impressions · Likes · Comments · Shares">
                  {[t.impressions, t.likes, t.comments, t.shares].every((v) => v == null) ? (
                    <span className="font-normal text-muted-foreground">Available once connected live</span>
                  ) : (
                    [t.impressions, t.likes, t.comments, t.shares].map((v) => (v == null ? "—" : v.toLocaleString("en-CA"))).join(" · ")
                  )}
                </Row>
              </div>
              {t.error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{t.error}</p>}
            </section>
          ))}
        </div>

        {(post.status === "SCHEDULED" || hasFailed || error) && (
          <div className="space-y-3 border-t border-border px-5 py-4">
            {error && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {post.status === "SCHEDULED" &&
                (confirmCancel ? (
                  <>
                    <span className="mr-auto self-center text-xs text-muted-foreground">Cancel this scheduled post?</span>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(false)} disabled={!!busy}>
                      Keep it
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => act("cancel")} loading={busy === "cancel"}>
                      Yes, cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(true)}>
                    Cancel post
                  </Button>
                ))}
              {hasFailed && (
                <Button size="sm" onClick={() => act("retry")} loading={busy === "retry"}>
                  Retry failed platforms
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
