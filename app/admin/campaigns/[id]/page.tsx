"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Business = {
  id: string;
  name: string;
  website: string;
  status: string;
  opportunityScore: number;
  contactCount: number;
  auditCount: number;
  providerSource: string | null;
};

type CampaignDetail = {
  campaign: { id: string; name: string; city: string; category: string; status: string; createdAt: string };
  counts: { discovered: number; audited: number; contacted: number; converted: number };
  businesses: Business[];
};

const STATUS_CLASSES: Record<string, string> = {
  CONVERTED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  AUDITED: "bg-primary/10 text-primary border border-primary/20",
  OUTREACH_ACTIVE: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
};
const DEFAULT_STATUS_CLASS = "bg-muted-foreground/10 text-muted-foreground border border-border";

export default function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/admin/campaigns/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load campaign");
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
      }
    }
    fetchDetail();
  }, [id]);

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center text-body-small font-semibold text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />;
  }

  const { campaign, counts, businesses } = data;
  const mocked = businesses.length > 0 && businesses.every((b) => b.providerSource === "SEED");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-metadata font-semibold text-muted-foreground hover:text-primary">
          &larr; All Campaigns
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-heading-2 font-semibold text-foreground">{campaign.name}</h1>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
            {campaign.status}
          </span>
        </div>
        <p className="mt-1 text-body-small text-muted-foreground">
          {campaign.category} &bull; {campaign.city} &bull; Created {new Date(campaign.createdAt).toLocaleDateString()}
        </p>
      </div>

      {mocked && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-body-small font-semibold text-amber-700">
          Discovery for this campaign used seed/mock data — real Google Places / DataForSEO discovery isn&apos;t connected yet (see docs/mvp-readiness.md).
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Discovered</span>
          <span className="mt-1 block text-heading-2 font-bold text-foreground">{counts.discovered}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Audited</span>
          <span className="mt-1 block text-heading-2 font-bold text-primary">{counts.audited}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Contacts Found</span>
          <span className="mt-1 block text-heading-2 font-bold text-foreground">{counts.contacted}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Converted</span>
          <span className="mt-1 block text-heading-2 font-bold text-emerald-600">{counts.converted}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-body font-bold text-foreground">Businesses in this campaign</h2>
        </div>
        {businesses.length === 0 ? (
          <div className="p-8 text-center text-body-small text-muted-foreground">No businesses discovered yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/businesses/${b.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-muted/40">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{b.name}</p>
                    <p className="truncate text-metadata text-muted-foreground">{b.website.replace(/^https?:\/\//, "")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-metadata text-muted-foreground">{b.contactCount} contact{b.contactCount === 1 ? "" : "s"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[b.status] || DEFAULT_STATUS_CLASS}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
