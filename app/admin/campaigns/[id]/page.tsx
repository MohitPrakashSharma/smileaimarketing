"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";

interface Business {
  id: string;
  name: string;
  website: string;
  status: string;
  opportunityScore: number;
  contactCount: number;
  auditCount: number;
  providerSource: string | null;
}

interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    country: string;
    state: string | null;
    city: string;
    category: string;
    status: string;
    createdAt: string;
    maxBusinesses: number;
    minReviewCount: number | null;
    websiteRequired: boolean;
    excludeChains: boolean;
    excludeExistingContacts: boolean;
    keywords: string[];
    competitorCount: number;
    dataFreshnessDays: number;
    dataProvider: string;
    outreachDailyLimit: number;
    testMode: boolean;
  };
  counts: {
    discovered: number;
    contactsFound: number;
    audited: number;
    pdfReady: number;
    outreachSent: number;
    replied: number;
    converted: number;
  };
  businesses: Business[];
}

export default function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load campaign");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDetail]);

  const handleCampaignAction = async (action: "start" | "pause" | "resume" | "retry") => {
    setActionLoading(true);
    setActionMessage("");
    try {
      if (action === "start" || action === "retry") {
        const res = await fetch(`/api/admin/campaigns/${id}/start`, { method: "POST" });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to start campaign");
        setActionMessage("Campaign discovery job queued successfully!");
      } else {
        const newStatus = action === "pause" ? "PAUSED" : "DISCOVERING";
        const res = await fetch(`/api/admin/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to update campaign status");
        setActionMessage(`Campaign status updated to ${newStatus}`);
      }
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-xs font-bold text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  const { campaign, counts, businesses } = data;

  const renderPrimaryCampaignAction = () => {
    if (campaign.status === "DRAFT") {
      return (
        <Button onClick={() => handleCampaignAction("start")} loading={actionLoading} className="!h-9">
          Start Campaign
        </Button>
      );
    }
    if (campaign.status === "PAUSED") {
      return (
        <Button onClick={() => handleCampaignAction("resume")} loading={actionLoading} className="!h-9">
          Resume Campaign
        </Button>
      );
    }
    if (campaign.status === "FAILED") {
      return (
        <Button onClick={() => handleCampaignAction("retry")} loading={actionLoading} className="!h-9">
          Retry Campaign
        </Button>
      );
    }
    return (
      <Button variant="outline" onClick={() => handleCampaignAction("pause")} loading={actionLoading} className="!h-9">
        Pause Campaign
      </Button>
    );
  };

  // Every node reflects real counts from the database — nothing here is a
  // manual trigger. The whole thing runs automatically once "Start Campaign"
  // kicks off discovery: enrichment, audit, PDF, and outreach all follow
  // with no approval step in between.
  const isDiscovering = campaign.status === "DISCOVERING";
  type NodeState = "done" | "running" | "pending";
  const pipelineNodes: { icon: string; name: string; sub: string; count: number; state: NodeState }[] = [
    {
      icon: "🔍",
      name: "Discovery",
      sub: `Google/DataForSEO in ${campaign.city}`,
      count: counts.discovered,
      state: isDiscovering ? "running" : counts.discovered > 0 ? "done" : "pending",
    },
    {
      icon: "📇",
      name: "Contact Enrichment",
      sub: "Apollo, then practice website",
      count: counts.contactsFound,
      state: counts.contactsFound > 0 ? "done" : counts.discovered > 0 ? "running" : "pending",
    },
    {
      icon: "📊",
      name: "Audit",
      sub: "Real website check + DataForSEO rank + AI",
      count: counts.audited,
      state: counts.audited > 0 ? "done" : counts.discovered > 0 ? "running" : "pending",
    },
    {
      icon: "📄",
      name: "PDF Report",
      sub: "Auto-generated per practice",
      count: counts.pdfReady,
      state: counts.pdfReady > 0 ? "done" : counts.audited > 0 ? "running" : "pending",
    },
    {
      icon: "✉️",
      name: "AI Outreach Email",
      sub: "Short, AI-written — sent automatically",
      count: counts.outreachSent,
      state: counts.outreachSent > 0 ? "done" : counts.audited > 0 ? "running" : "pending",
    },
    {
      icon: "💬",
      name: "Reply / Meeting",
      sub: "Waiting on the practice",
      count: counts.replied,
      state: counts.replied > 0 ? "done" : counts.outreachSent > 0 ? "running" : "pending",
    },
    {
      icon: "🏆",
      name: "Won",
      sub: "Converted to a client",
      count: counts.converted,
      state: counts.converted > 0 ? "done" : "pending",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/campaigns" className="text-xs font-bold text-muted-foreground hover:text-primary">
            &larr; Back to Campaigns
          </Link>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {campaign.category} &bull; {campaign.city}, {campaign.country} &bull; Target: {campaign.maxBusinesses} practices
          </p>
        </div>

        <div className="flex items-center gap-2">
          {renderPrimaryCampaignAction()}
          <ActionMenu
            items={[
              { label: "Start Discovery", onClick: () => handleCampaignAction("start") },
              { label: "Pause Campaign", onClick: () => handleCampaignAction("pause") },
              { label: "Resume Campaign", onClick: () => handleCampaignAction("resume") },
              { label: "Retry / Rerun Step", onClick: () => handleCampaignAction("retry") },
            ]}
          />
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Automation Pipeline — live counts only, nothing here is a manual trigger */}
      <AdminCard
        header={
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Automation Pipeline</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Runs end to end with no manual approval once discovery starts.
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-0 overflow-x-auto pb-1 sm:flex-row sm:items-stretch">
          {pipelineNodes.map((node, i) => (
            <div key={node.name} className="flex flex-1 sm:min-w-[140px] sm:items-center">
              <div
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                  node.state === "done"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : node.state === "running"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border bg-background"
                }`}
              >
                {node.state === "running" && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                )}
                <span className="text-lg leading-none">{node.icon}</span>
                <span
                  className={`text-base font-extrabold ${
                    node.state === "done" ? "text-emerald-400" : node.state === "running" ? "text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {node.count}
                </span>
                <span className="text-[11px] font-bold text-foreground">{node.name}</span>
                <span className="text-[10px] text-muted-foreground">{node.sub}</span>
              </div>
              {i < pipelineNodes.length - 1 && (
                <div className="hidden h-px w-3 shrink-0 self-center bg-border sm:block" />
              )}
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Discovered Practices Table */}
      <AdminCard title={`Discovered Practices (${businesses.length})`}>
        {businesses.length === 0 ? (
          <EmptyState title="No practices discovered yet" message="Start campaign to begin local business discovery." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Practice</th>
                  <th className="px-3 py-2.5">Website</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Score</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-muted/30">
                    <td className="px-3 py-2.5 font-bold text-foreground">
                      <Link href={`/admin/businesses/${b.id}`} className="hover:text-primary">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {b.website.replace(/^https?:\/\//, "")}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-primary">{b.opportunityScore}/100</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="inline-flex h-7 items-center rounded-md bg-surface-muted px-2.5 text-[11px] font-bold text-foreground hover:bg-border"
                      >
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
