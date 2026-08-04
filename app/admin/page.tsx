"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconTarget,
  IconStorefront,
  IconChat,
  IconCalendarCheck,
  IconSettings,
  IconCheck,
  IconAlertTriangle,
} from "@/components/icons";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface CampaignItem {
  id: string;
  name: string;
  city: string;
  status: string;
  createdAt: string;
}

interface BusinessItem {
  id: string;
  name: string;
  website: string;
  city: string;
  state?: string;
  status: string;
  opportunityScore: number;
  contactCount: number;
  auditCount: number;
}

interface AuditItem {
  id: string;
  publicToken: string;
  score: number;
  status: string;
  pdfStatus: string;
  pdfUrl?: string;
  viewCount: number;
  business?: { name: string; website: string; id: string; city?: string };
}

interface AppointmentItem {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: string;
  scheduledTime: string;
  business?: { id: string; name: string; city?: string };
  contact?: { firstName: string; lastName: string; email: string };
}

interface OutreachItem {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { id: string; name: string; city?: string } };
  step?: { subject: string };
}

interface IntegrationStatusItem {
  key: string;
  name: string;
  status: string;
  details: string;
}

export default function AdminOverviewPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [messages, setMessages] = useState<OutreachItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverviewData = useCallback(async () => {
    try {
      const [cRes, bRes, aRes, apRes, oRes, iRes] = await Promise.all([
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/businesses"),
        fetch("/api/admin/audits"),
        fetch("/api/admin/appointments"),
        fetch("/api/admin/outreach"),
        fetch("/api/admin/integrations/status"),
      ]);

      const [cData, bData, aData, apData, oData, iData] = await Promise.all([
        cRes.json(),
        bRes.json(),
        aRes.json(),
        apRes.json(),
        oRes.json(),
        iRes.json(),
      ]);

      if (cRes.ok) setCampaigns(cData.campaigns || []);
      if (bRes.ok) setBusinesses(bData.businesses || []);
      if (aRes.ok) setAudits(aData.audits || []);
      if (apRes.ok) setAppointments(apData.appointments || []);
      if (oRes.ok) setMessages(oData.messages || []);
      if (iRes.ok) setIntegrations(iData.integrations || []);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOverviewData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOverviewData]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  // 1. Leads awaiting verification
  const leadsAwaitingVerification = businesses.filter(
    (b) => b.status === "DISCOVERED" || b.status === "PENDING_VERIFICATION"
  );

  // 2. Audits/PDFs ready for review
  const auditsReady = audits.filter((a) => a.status === "COMPLETED" || a.pdfStatus === "READY");

  // 3. Emails awaiting approval
  const emailsAwaitingApproval = messages.filter(
    (m) => m.status === "QUEUED" || m.status === "PENDING"
  );

  // 4. Meetings requiring action
  const meetingsRequested = appointments.filter((ap) => ap.status === "REQUESTED");

  // 5. Campaigns failed or paused
  const campaignsFailedOrPaused = campaigns.filter(
    (c) => c.status === "FAILED" || c.status === "PAUSED" || c.status === "DRAFT"
  );

  // 6. Integration problems
  const integrationIssues = integrations.filter(
    (i) => i.status === "MISSING" || i.status === "MOCKED" || i.status === "TEST_MODE"
  );

  // Summary Metrics Counts
  const activeCampaignsCount = campaigns.filter((c) => c.status === "RUNNING" || c.status === "ACTIVE").length;
  const leadsAwaitingActionCount = leadsAwaitingVerification.length;
  const auditsReadyCount = auditsReady.length;
  const meetingsRequestedCount = meetingsRequested.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Overview</h1>
          <p className="text-body-small text-muted-foreground">
            What needs your operational attention right now across practice lead funnels.
          </p>
        </div>
      </div>

      {/* Top Summary Metrics Row (4 Small Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Campaigns</span>
            <IconTarget className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{activeCampaignsCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Leads Awaiting Action</span>
            <IconStorefront className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{leadsAwaitingActionCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Audits Ready</span>
            <IconCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{auditsReadyCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meetings Requested</span>
            <IconCalendarCheck className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{meetingsRequestedCount}</p>
        </div>
      </div>

      {/* 6 Action Queues (2 Column Responsive Grid) */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* 1. Leads Awaiting Verification */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconStorefront className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Leads Awaiting Verification</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {leadsAwaitingVerification.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/businesses" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {leadsAwaitingVerification.length === 0 ? (
            <EmptyState title="All leads verified" message="No discovered practices awaiting verification." />
          ) : (
            <ul className="divide-y divide-border/50">
              {leadsAwaitingVerification.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{lead.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{lead.city || "Location Pending"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/businesses/${lead.id}`}
                      className="inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
                    >
                      Verify
                    </Link>
                    <ActionMenu
                      items={[
                        { label: "View Practice", onClick: () => (window.location.href = `/admin/businesses/${lead.id}`) },
                        { label: "Reject Practice", variant: "danger", onClick: () => alert(`Rejecting ${lead.name}`) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* 2. Audits or PDFs Ready for Review */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Audits & Reports Ready</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {auditsReady.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/audits" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {auditsReady.length === 0 ? (
            <EmptyState title="No pending audits" message="All generated audit reports have been reviewed." />
          ) : (
            <ul className="divide-y divide-border/50">
              {auditsReady.slice(0, 5).map((audit) => (
                <li key={audit.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{audit.business?.name || "Practice Audit"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">Score {audit.score}/100</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/audit/${audit.publicToken}`}
                      target="_blank"
                      className="inline-flex h-8 items-center rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Review
                    </Link>
                    <ActionMenu
                      items={[
                        { label: "View Audit Page", onClick: () => (window.location.href = `/audit/${audit.publicToken}`) },
                        { label: "Download PDF", onClick: () => window.open(`/api/audit/${audit.publicToken}/pdf`, "_blank") },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* 3. Emails Awaiting Approval */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconChat className="h-4 w-4 text-sky-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Emails Awaiting Approval</h2>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                {emailsAwaitingApproval.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/outreach" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {emailsAwaitingApproval.length === 0 ? (
            <EmptyState title="No emails queued" message="All outreach messages have been dispatched or reviewed." />
          ) : (
            <ul className="divide-y divide-border/50">
              {emailsAwaitingApproval.slice(0, 5).map((msg) => (
                <li key={msg.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {msg.contact?.business?.name || (msg.contact ? `${msg.contact.firstName} ${msg.contact.lastName}` : "Lead")}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{msg.step?.subject || "Outreach Email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/outreach"
                      className="inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
                    >
                      Approve
                    </Link>
                    <ActionMenu
                      items={[
                        { label: "Go to Outreach", onClick: () => (window.location.href = "/admin/outreach") },
                        { label: "Cancel Email", variant: "danger", onClick: () => alert(`Cancelling email ${msg.id}`) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* 4. Meetings Requiring Action */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconCalendarCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Meetings Requiring Action</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {meetingsRequested.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/meetings" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {meetingsRequested.length === 0 ? (
            <EmptyState title="No pending meeting requests" message="All consultation requests have been scheduled." />
          ) : (
            <ul className="divide-y divide-border/50">
              {meetingsRequested.slice(0, 5).map((app) => (
                <li key={app.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{app.business?.name || "Practice Request"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {app.type === "ONLINE" ? "Video Consultation" : "In-Person Visit"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/meetings"
                      className="inline-flex h-8 items-center rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Schedule
                    </Link>
                    <ActionMenu
                      items={[
                        { label: "View Meetings", onClick: () => (window.location.href = "/admin/meetings") },
                        { label: "Decline Request", variant: "danger", onClick: () => alert(`Declining meeting ${app.id}`) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* 5. Campaigns Failed or Paused */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconTarget className="h-4 w-4 text-rose-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Campaigns Requiring Action</h2>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                {campaignsFailedOrPaused.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/campaigns" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {campaignsFailedOrPaused.length === 0 ? (
            <EmptyState title="All campaigns running" message="No campaigns are currently failed or paused." />
          ) : (
            <ul className="divide-y divide-border/50">
              {campaignsFailedOrPaused.slice(0, 5).map((camp) => (
                <li key={camp.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{camp.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-[11px] text-muted-foreground">{camp.city}</span>
                      <StatusBadge status={camp.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/campaigns/${camp.id}`}
                      className="inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
                    >
                      Control
                    </Link>
                    <ActionMenu
                      items={[
                        { label: "Open Campaign", onClick: () => (window.location.href = `/admin/campaigns/${camp.id}`) },
                        { label: "Retry Campaign", onClick: () => alert(`Retrying ${camp.name}`) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* 6. Integration Problems */}
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Integration Warnings</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {integrationIssues.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/integrations" className="text-xs font-bold text-primary hover:underline">
              View status
            </Link>
          }
        >
          {integrationIssues.length === 0 ? (
            <EmptyState title="All integrations healthy" message="All background services and APIs are connected." />
          ) : (
            <ul className="divide-y divide-border/50">
              {integrationIssues.map((integ) => (
                <li key={integ.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{integ.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{integ.details}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/integrations"
                      className="inline-flex h-8 items-center rounded-lg bg-surface-muted px-3 text-xs font-bold text-foreground hover:bg-border"
                    >
                      Check
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
