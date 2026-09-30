"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentPanel } from "@/components/clinic/social/AgentPanel";
import { PostsTable } from "@/components/clinic/social/PostsTable";
import { PostDrawer } from "@/components/clinic/social/PostDrawer";
import { AccountsCard } from "@/components/clinic/social/AccountsCard";
import type { SocialAccount, SocialPost } from "@/components/clinic/social/types";

export default function ClinicSocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [metaAvailable, setMetaAvailable] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic/social/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts);
        setMetaAvailable(!!data.metaAvailable);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadAccounts, 0);
    return () => clearTimeout(timer);
  }, [loadAccounts]);

  // No synchronous setState here: it runs from effects, and the first load already starts in the loading state.
  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (platform) qs.set("platform", platform);
    if (status) qs.set("status", status);
    try {
      const res = await fetch(`/api/clinic/social/posts?${qs}`);
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, [platform, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Scheduled posts publish in the background worker — refresh while any are due.
  const hasScheduled = posts.some((p) => p.status === "SCHEDULED" || p.status === "PUBLISHING");
  useEffect(() => {
    if (!hasScheduled) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [hasScheduled, load]);

  const upsert = (post: SocialPost) => setPosts((list) => [post, ...list.filter((p) => p.id !== post.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const openPost = posts.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-heading-3 font-semibold text-foreground">Social media</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask the assistant for a post, choose the platforms, and track every post below.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AgentPanel onPublished={upsert} livePlatforms={accounts.filter((a) => a.live).map((a) => a.platform)} />
        <AccountsCard accounts={accounts} metaAvailable={metaAvailable} onChange={setAccounts} reload={loadAccounts} />
      </div>

      <PostsTable
        posts={posts}
        loading={loading}
        platform={platform}
        status={status}
        onPlatform={setPlatform}
        onStatus={setStatus}
        onOpen={(p) => setOpenId(p.id)}
      />

      {openPost && <PostDrawer post={openPost} onClose={() => setOpenId(null)} onChange={upsert} />}
    </div>
  );
}
