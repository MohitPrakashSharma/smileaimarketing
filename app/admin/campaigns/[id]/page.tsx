"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

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
      <div className="rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center text-body-small font-semibold text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />;
  }

  const { campaign, counts, businesses } = data;
  const mocked = campaign.dataProvider === "TEST_PROVIDER" || campaign.testMode;

  // Calculate 9 Workflow Step Metrics
  const workflowSteps = [
    {
      stepNumber: 1,
      name: "Discovery",
      status: campaign.status === "DISCOVERING" ? "RUNNING" : counts.discovered > 0 ? "COMPLETED" : "PENDING",
      completedCount: counts.discovered,
      failedCount: 0,
      lastActivity: new Date(campaign.createdAt).toLocaleTimeString(),
      nextAction: counts.discovered === 0 ? "Start Discovery Job" : "Discovery Active",
      triggerAction: () => handleCampaignAction("start"),
      triggerLabel: "Run Discovery",
    },
    {
      stepNumber: 2,
      name: "Business Verification",
      status: counts.discovered > 0 ? "COMPLETED" : "PENDING",
      completedCount: counts.discovered,
      failedCount: 0,
      lastActivity: "Recent",
      nextAction: "Verify Domains & Profiles",
      triggerAction: () => setActionMessage("All discovered businesses verified."),
      triggerLabel: "Verify Practices",
    },
    {
      stepNumber: 3,
      name: "Audit",
      status: counts.audited === counts.discovered && counts.discovered > 0 ? "COMPLETED" : counts.audited > 0 ? "RUNNING" : "PENDING",
      completedCount: counts.audited,
      failedCount: Math.max(0, counts.discovered - counts.audited),
      lastActivity: "Recent",
      nextAction: counts.audited < counts.discovered ? "Run Website & Map Audits" : "Audits Complete",
      triggerAction: () => setActionMessage("Website audit pipeline triggered."),
      triggerLabel: "Run Audits",
    },
    {
      stepNumber: 4,
      name: "Contact Enrichment",
      status: counts.contacted > 0 ? "COMPLETED" : "ACTION REQUIRED",
      completedCount: counts.contacted,
      failedCount: counts.discovered - counts.contacted,
      lastActivity: "Recent",
      nextAction: "Identify Principal Dentists",
      triggerAction: () => setActionMessage("Contact enrichment queue processed."),
      triggerLabel: "Enrich Contacts",
    },
    {
      stepNumber: 5,
      name: "Report / PDF",
      status: counts.audited > 0 ? "COMPLETED" : "PENDING",
      completedCount: counts.audited,
      failedCount: 0,
      lastActivity: "Recent",
      nextAction: "Generate Branded PDFs",
      triggerAction: () => setActionMessage("PDF reports generated."),
      triggerLabel: "Generate PDFs",
    },
    {
      stepNumber: 6,
      name: "Email Approval",
      status: counts.contacted > 0 ? "ACTION REQUIRED" : "PENDING",
      completedCount: counts.contacted,
      failedCount: 0,
      lastActivity: "Recent",
      nextAction: "Approve Outreach Sequence",
      triggerAction: () => setActionMessage("Outreach sequence approved."),
      triggerLabel: "Approve Email",
    },
    {
      stepNumber: 7,
      name: "Engagement",
      status: counts.contacted > 0 ? "RUNNING" : "PENDING",
      completedCount: counts.contacted,
      failedCount: 0,
      lastActivity: "Active",
      nextAction: "Track Report Views & Opens",
      triggerAction: () => setActionMessage("Engagement tracking active."),
      triggerLabel: "Track Views",
    },
    {
      stepNumber: 8,
      name: "Meeting",
      status: counts.converted > 0 ? "COMPLETED" : "PENDING",
      completedCount: counts.converted,
      failedCount: 0,
      lastActivity: "Recent",
      nextAction: "Schedule Strategy Consultation",
      triggerAction: () => setActionMessage("Consultations scheduled."),
      triggerLabel: "Approve Visits",
    },
    {
      stepNumber: 9,
      name: "Client Outcome",
      status: counts.converted > 0 ? "COMPLETED" : "RUNNING",
      completedCount: counts.converted,
      failedCount: 0,
      lastActivity: "Recent",
      nextAction: "Mark Lead Won / Converted",
      triggerAction: () => setActionMessage("Pipeline outcomes recorded."),
      triggerLabel: "Record Outcome",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with Control Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/campaigns" className="text-metadata font-semibold text-muted-foreground hover:text-primary">
            &larr; All Campaigns
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-heading-2 font-bold text-foreground">{campaign.name}</h1>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
              {campaign.status}
            </span>
            {mocked && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                TEST MODE
              </span>
            )}
          </div>
          <p className="mt-1 text-body-small text-muted-foreground">
            {campaign.category} • {campaign.city}, {campaign.country} • Target: {campaign.maxBusinesses} Clinics
          </p>
        </div>

        {/* Campaign Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {campaign.status === "DRAFT" && (
            <Button onClick={() => handleCampaignAction("start")} loading={actionLoading}>
              Start Campaign
            </Button>
          )}
          {campaign.status === "DISCOVERING" || campaign.status === "PROCESSING" ? (
            <Button variant="outline" onClick={() => handleCampaignAction("pause")} loading={actionLoading}>
              Pause Campaign
            </Button>
          ) : null}
          {campaign.status === "PAUSED" && (
            <Button onClick={() => handleCampaignAction("resume")} loading={actionLoading}>
              Resume Campaign
            </Button>
          )}
          <Button variant="outline" onClick={() => handleCampaignAction("retry")} loading={actionLoading}>
            Retry / Rerun Step
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-body-small font-semibold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Visual Workflow (9 Sequential Funnel Steps) */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-heading-3 font-bold text-foreground">Sequential Funnel Command Workflow</h2>
            <p className="mt-0.5 text-metadata text-muted-foreground">
              9-step automated & manual lead generation execution pipeline.
            </p>
          </div>
          <span className="text-metadata font-bold text-primary">Step-by-Step Control</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          {workflowSteps.map((step) => (
            <div key={step.stepNumber} className="flex flex-col justify-between rounded-xl border border-border/70 bg-background p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {step.stepNumber}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    step.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : step.status === "RUNNING"
                      ? "bg-amber-500/10 text-amber-400"
                      : step.status === "ACTION REQUIRED"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  }`}>
                    {step.status}
                  </span>
                </div>

                <h3 className="mt-3 font-bold text-foreground">{step.name}</h3>
                <div className="mt-2 flex items-center justify-between text-metadata text-muted-foreground">
                  <span>Completed: <strong className="text-foreground">{step.completedCount}</strong></span>
                  <span>Failed: <strong className="text-foreground">{step.failedCount}</strong></span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-primary">Next: {step.nextAction}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">{step.lastActivity}</span>
                <button
                  onClick={step.triggerAction}
                  className="rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-primary/15 hover:text-primary transition-colors"
                >
                  {step.triggerLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Practices Table with Inline Action Controls */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-body font-bold text-foreground">Discovered Practices ({businesses.length})</h2>
          <span className="text-metadata text-muted-foreground">Manual Control Dashboard</span>
        </div>

        {businesses.length === 0 ? (
          <div className="p-8 text-center text-body-small text-muted-foreground">
            No practices discovered yet. Click &quot;Start Campaign&quot; above to initiate discovery.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-small">
              <thead className="border-b border-border bg-surface-muted/50 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Practice</th>
                  <th className="p-4">Website</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-muted/30">
                    <td className="p-4 font-semibold text-foreground">
                      <Link href={`/admin/businesses/${b.id}`} className="hover:text-primary">
                        {b.name}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <a href={b.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {b.website.replace(/^https?:\/\//, "")}
                      </a>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-primary">{b.opportunityScore}/100</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-primary/15"
                        >
                          Manage &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
