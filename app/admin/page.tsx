"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconTarget,
  IconStorefront,
  IconChat,
  IconCalendarCheck,
  IconTrendingUp,
  IconSettings,
  IconCheck,
} from "@/components/icons";

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
  business?: { name: string; website: string; id: string };
}

interface AppointmentItem {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: string;
  scheduledTime: string;
  business?: { id: string; name: string };
  contact?: { firstName: string; lastName: string; email: string };
}

interface OutreachItem {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { id: string; name: string } };
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

  // 1. Campaigns requiring action
  const campaignsNeedingAction = campaigns.filter(
    (c) => c.status === "DRAFT" || c.status === "PAUSED" || c.status === "FAILED"
  );

  // 2. Businesses awaiting verification
  const businessesAwaitingVerification = businesses.filter(
    (b) => b.status === "DISCOVERED" || b.status === "PENDING_VERIFICATION"
  );

  // 3. Audits ready
  const auditsReady = audits.filter((a) => a.status === "COMPLETED");

  // 4. PDFs failed or ready
  const pdfsAttention = audits.filter(
    (a) => a.pdfStatus === "FAILED" || a.pdfStatus === "READY"
  );

  // 5. Contacts missing
  const contactsMissing = businesses.filter((b) => b.contactCount === 0);

  // 6. Emails awaiting approval
  const emailsAwaitingApproval = messages.filter(
    (m) => m.status === "QUEUED" || m.status === "PENDING"
  );

  // 7. Hot report viewers
  const hotReportViewers = audits
    .filter((a) => a.viewCount > 0)
    .sort((a, b) => b.viewCount - a.viewCount);

  // 8. Meetings requested
  const meetingsRequested = appointments.filter((ap) => ap.status === "REQUESTED");

  // 9. Integration failures/warnings
  const integrationIssues = integrations.filter(
    (i) => i.status === "MISSING" || i.status === "MOCKED" || i.status === "TEST_MODE"
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">Campaign Command Centre</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Actionable queues requiring admin intervention across active practice lead funnels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/campaigns"
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            + Create New Campaign
          </Link>
          <Link
            href="/admin/integrations"
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            System Status
          </Link>
        </div>
      </div>

      {/* 9 Actionable Queues Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Campaigns Requiring Action */}
        <QueueCard
          title="Campaigns Requiring Action"
          badgeCount={campaignsNeedingAction.length}
          badgeColor="bg-amber-500/10 text-amber-400"
          Icon={IconTarget}
          emptyText="All campaigns active & running smoothly."
          viewAllHref="/admin/campaigns"
          items={campaignsNeedingAction.map((c) => ({
            id: c.id,
            primary: c.name,
            secondary: `${c.city} • ${c.status}`,
            href: `/admin/campaigns/${c.id}`,
            actionLabel: "Control Funnel",
          }))}
        />

        {/* 2. Businesses Awaiting Verification */}
        <QueueCard
          title="Businesses Awaiting Verification"
          badgeCount={businessesAwaitingVerification.length}
          badgeColor="bg-indigo-500/10 text-indigo-400"
          Icon={IconStorefront}
          emptyText="No discovered practices pending review."
          viewAllHref="/admin/businesses?status=DISCOVERED"
          items={businessesAwaitingVerification.map((b) => ({
            id: b.id,
            primary: b.name,
            secondary: b.website.replace(/^https?:\/\//, ""),
            href: `/admin/businesses/${b.id}`,
            actionLabel: "Verify Practice",
          }))}
        />

        {/* 3. Audits Ready */}
        <QueueCard
          title="Audits Ready for Review"
          badgeCount={auditsReady.length}
          badgeColor="bg-emerald-500/10 text-emerald-400"
          Icon={IconCheck}
          emptyText="No completed audits pending review."
          viewAllHref="/admin/audits"
          items={auditsReady.slice(0, 5).map((a) => ({
            id: a.id,
            primary: a.business?.name || "Practice Audit",
            secondary: `Opportunity Score ${a.score}/100`,
            href: `/audit/${a.publicToken}`,
            actionLabel: "View Report",
          }))}
        />

        {/* 4. PDFs Failed or Ready */}
        <QueueCard
          title="PDF Reports (Ready / Failed)"
          badgeCount={pdfsAttention.length}
          badgeColor="bg-primary/10 text-primary"
          Icon={IconTarget}
          emptyText="No PDF actions currently required."
          viewAllHref="/admin/audits"
          items={pdfsAttention.slice(0, 5).map((a) => ({
            id: a.id,
            primary: a.business?.name || "Audit PDF",
            secondary: `Status: ${a.pdfStatus}`,
            href: `/api/audit/${a.publicToken}/pdf`,
            actionLabel: a.pdfStatus === "READY" ? "Download PDF" : "Regenerate PDF",
          }))}
        />

        {/* 5. Contacts Missing */}
        <QueueCard
          title="Practices Missing Contacts"
          badgeCount={contactsMissing.length}
          badgeColor="bg-danger/10 text-danger"
          Icon={IconStorefront}
          emptyText="All practices have decision maker contacts."
          viewAllHref="/admin/businesses?missing=contact"
          items={contactsMissing.slice(0, 5).map((b) => ({
            id: b.id,
            primary: b.name,
            secondary: `${b.city} • No contact found`,
            href: `/admin/businesses/${b.id}`,
            actionLabel: "Add Contact",
          }))}
        />

        {/* 6. Emails Awaiting Approval */}
        <QueueCard
          title="Emails Awaiting Approval"
          badgeCount={emailsAwaitingApproval.length}
          badgeColor="bg-amber-500/10 text-amber-400"
          Icon={IconChat}
          emptyText="No outreach messages queued."
          viewAllHref="/admin/outreach"
          items={emailsAwaitingApproval.slice(0, 5).map((m) => ({
            id: m.id,
            primary: m.contact?.business?.name || (m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "Lead"),
            secondary: m.step?.subject || "Initial Outreach",
            href: "/admin/outreach",
            actionLabel: "Review & Approve",
          }))}
        />

        {/* 7. Hot Report Viewers */}
        <QueueCard
          title="Hot Audit Report Viewers"
          badgeCount={hotReportViewers.length}
          badgeColor="bg-emerald-500/10 text-emerald-400"
          Icon={IconTrendingUp}
          emptyText="No recent report views detected."
          viewAllHref="/admin/audits"
          items={hotReportViewers.slice(0, 5).map((a) => ({
            id: a.id,
            primary: a.business?.name || "Practice",
            secondary: `${a.viewCount} views • Score ${a.score}/100`,
            href: `/admin/businesses/${a.business?.id || ""}`,
            actionLabel: "Follow Up Now",
          }))}
        />

        {/* 8. Meetings Requested */}
        <QueueCard
          title="Meetings Requested"
          badgeCount={meetingsRequested.length}
          badgeColor="bg-emerald-500/10 text-emerald-400"
          Icon={IconCalendarCheck}
          emptyText="No consultation or visit requests pending."
          viewAllHref="/admin/meetings"
          items={meetingsRequested.slice(0, 5).map((ap) => ({
            id: ap.id,
            primary: ap.business?.name || "Practice",
            secondary: `${ap.type === "ONLINE" ? "Video Review" : "In-Person Visit"} • ${ap.contact ? ap.contact.firstName : ""}`,
            href: "/admin/meetings",
            actionLabel: "Approve / Schedule",
          }))}
        />

        {/* 9. Integration Failures / Health */}
        <QueueCard
          title="Integration Health Warnings"
          badgeCount={integrationIssues.length}
          badgeColor="bg-amber-500/10 text-amber-400"
          Icon={IconSettings}
          emptyText="All integrations green and connected."
          viewAllHref="/admin/integrations"
          items={integrationIssues.map((i) => ({
            id: i.key,
            primary: i.name,
            secondary: i.details,
            href: "/admin/integrations",
            actionLabel: "Check Status",
          }))}
        />
      </div>
    </div>
  );
}

function QueueCard({
  title,
  badgeCount,
  badgeColor,
  Icon,
  emptyText,
  viewAllHref,
  items,
}: {
  title: string;
  badgeCount: number;
  badgeColor: string;
  Icon: typeof IconTarget;
  emptyText: string;
  viewAllHref: string;
  items: { id: string; primary: string; secondary: string; href: string; actionLabel: string }[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-body font-bold text-foreground">{title}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}>
          {badgeCount}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="my-6 text-center text-body-small text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="my-2 divide-y divide-border/40">
          {items.map((item) => (
            <li key={item.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-body-small font-semibold text-foreground">{item.primary}</p>
                  <p className="truncate text-metadata text-muted-foreground">{item.secondary}</p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/15"
                >
                  {item.actionLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-3 text-right">
        <Link href={viewAllHref} className="text-metadata font-bold text-muted-foreground hover:text-primary">
          View All Items &rarr;
        </Link>
      </div>
    </div>
  );
}
