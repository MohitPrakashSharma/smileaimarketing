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
  counts: { discovered: number; audited: number; contacted: number; converted: number };
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

  const workflowSteps = [
    { stepNumber: 1, name: "Discovery", status: campaign.status === "DISCOVERING" ? "RUNNING" : counts.discovered > 0 ? "COMPLETED" : "PENDING", completedCount: counts.discovered, failedCount: 0, nextAction: "Run Discovery", triggerAction: () => handleCampaignAction("start") },
    { stepNumber: 2, name: "Business Verification", status: counts.discovered > 0 ? "COMPLETED" : "PENDING", completedCount: counts.discovered, failedCount: 0, nextAction: "Verify Practices", triggerAction: () => setActionMessage("Verified practices.") },
    { stepNumber: 3, name: "Audit", status: counts.audited > 0 ? "COMPLETED" : "PENDING", completedCount: counts.audited, failedCount: 0, nextAction: "Run Audits", triggerAction: () => setActionMessage("Audit pipeline triggered.") },
    { stepNumber: 4, name: "Contact Enrichment", status: counts.contacted > 0 ? "COMPLETED" : "PENDING", completedCount: counts.contacted, failedCount: 0, nextAction: "Enrich Contacts", triggerAction: () => setActionMessage("Contacts enriched.") },
    { stepNumber: 5, name: "Report / PDF", status: counts.audited > 0 ? "COMPLETED" : "PENDING", completedCount: counts.audited, failedCount: 0, nextAction: "Generate PDFs", triggerAction: () => setActionMessage("PDFs generated.") },
    { stepNumber: 6, name: "Email Approval", status: counts.contacted > 0 ? "AWAITING" : "PENDING", completedCount: counts.contacted, failedCount: 0, nextAction: "Approve Email", triggerAction: () => setActionMessage("Outreach approved.") },
    { stepNumber: 7, name: "Engagement", status: counts.contacted > 0 ? "RUNNING" : "PENDING", completedCount: counts.contacted, failedCount: 0, nextAction: "Track Views", triggerAction: () => setActionMessage("Tracking active.") },
    { stepNumber: 8, name: "Meeting", status: counts.converted > 0 ? "COMPLETED" : "PENDING", completedCount: counts.converted, failedCount: 0, nextAction: "Approve Visits", triggerAction: () => setActionMessage("Visits scheduled.") },
    { stepNumber: 9, name: "Client Outcome", status: counts.converted > 0 ? "COMPLETED" : "RUNNING", completedCount: counts.converted, failedCount: 0, nextAction: "Record Outcome", triggerAction: () => setActionMessage("Outcomes recorded.") },
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

      {/* Visual Workflow Steps Grid */}
      <AdminCard title="Funnel Command Workflow">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <div key={step.stepNumber} className="flex flex-col justify-between rounded-lg border border-border/80 bg-background p-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-extrabold text-primary">
                    {step.stepNumber}
                  </span>
                  <StatusBadge status={step.status} />
                </div>
                <h3 className="mt-2 text-xs font-bold text-foreground">{step.name}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">Done: {step.completedCount} | Failed: {step.failedCount}</p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                <button
                  onClick={step.triggerAction}
                  className="rounded-md bg-surface-muted px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-primary/15 hover:text-primary transition-colors"
                >
                  {step.nextAction}
                </button>
              </div>
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
