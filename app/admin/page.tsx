"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconStorefront,
  IconTarget,
  IconTrendingUp,
  IconCalendarCheck,
  IconChat,
  IconMapPin,
} from "@/components/icons";

type Business = {
  id: string;
  name: string;
  website: string;
  city: string;
  status: string;
  opportunityScore: number;
  createdAt: string;
};

type Audit = {
  id: string;
  publicToken: string;
  score: number;
  status: string;
  createdAt: string;
  business?: { name: string; website: string };
};

type Appointment = {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: string;
  scheduledTime: string;
  createdAt: string;
  business?: { name: string; website: string };
  contact?: { firstName: string; lastName: string; email: string };
};

type OutreachMessage = {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { website: string } };
  step?: { subject: string };
};

type ActivityItem = {
  id: string;
  createdAt: string;
  label: string;
  detail: string;
  Icon: typeof IconStorefront;
};

export default function AdminOverviewPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [bRes, aRes, apRes, oRes] = await Promise.all([
          fetch("/api/admin/businesses"),
          fetch("/api/admin/audits"),
          fetch("/api/admin/appointments"),
          fetch("/api/admin/outreach"),
        ]);
        const [bData, aData, apData, oData] = await Promise.all([
          bRes.json(),
          aRes.json(),
          apRes.json(),
          oRes.json(),
        ]);
        if (bRes.ok) setBusinesses(bData.businesses || []);
        if (aRes.ok) setAudits(aData.audits || []);
        if (apRes.ok) setAppointments(apData.appointments || []);
        if (oRes.ok) setMessages(oData.messages || []);
      } catch (err) {
        console.error("Error loading overview:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  const completedAudits = audits.filter((a) => a.status === "COMPLETED").slice(0, 5);
  const hotLeads = [...businesses]
    .filter((b) => b.opportunityScore >= 60)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);
  const followUpsDue = businesses.filter(
    (b) => b.status === "OUTREACH_PENDING" || b.status === "OUTREACH_ACTIVE"
  );
  const queuedEmails = messages.filter((m) => m.status === "QUEUED").slice(0, 5);
  const onlineMeetings = appointments.filter((a) => a.type === "ONLINE" && a.status === "SCHEDULED").slice(0, 5);
  const inPersonRequests = appointments.filter((a) => a.type === "IN_PERSON" && a.status === "SCHEDULED").slice(0, 5);

  const activity: ActivityItem[] = [
    ...audits.map((a) => ({
      id: `audit-${a.id}`,
      createdAt: a.createdAt,
      label: `${a.business?.name || "A practice"} audit ${a.status === "COMPLETED" ? "completed" : "started"}`,
      detail: `Score ${a.score}/100`,
      Icon: IconTarget,
    })),
    ...appointments.map((a) => ({
      id: `appt-${a.id}`,
      createdAt: a.createdAt,
      label: `${a.business?.name || "A practice"} booked a ${a.type === "ONLINE" ? "video review" : "in-person visit"}`,
      detail: a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : "",
      Icon: a.type === "ONLINE" ? IconCalendarCheck : IconMapPin,
    })),
    ...messages.map((m) => ({
      id: `msg-${m.id}`,
      createdAt: m.createdAt,
      label: `Outreach ${m.status.toLowerCase()} to ${m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "a lead"}`,
      detail: m.step?.subject || "",
      Icon: IconChat,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Businesses Tracked" value={businesses.length} Icon={IconStorefront} />
        <StatTile label="Audits Completed" value={completedAudits.length} Icon={IconTarget} />
        <StatTile label="Hot Leads" value={hotLeads.length} Icon={IconTrendingUp} />
        <StatTile label="Meetings Scheduled" value={onlineMeetings.length + inPersonRequests.length} Icon={IconCalendarCheck} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Queue
          title="Audits Ready for Review"
          emptyText="No completed audits yet."
          items={completedAudits.map((a) => ({
            id: a.id,
            primary: a.business?.name || "Practice",
            secondary: `Score ${a.score}/100`,
            href: `/audit/${a.publicToken}`,
          }))}
        />

        <Queue
          title="Hot Leads"
          emptyText="No high-opportunity leads yet."
          items={hotLeads.map((b) => ({
            id: b.id,
            primary: b.name,
            secondary: `${b.city} • ${b.opportunityScore}/100`,
            href: "/admin/businesses",
          }))}
        />

        <Queue
          title="Follow-ups Due"
          emptyText="No outreach in progress."
          items={followUpsDue.map((b) => ({
            id: b.id,
            primary: b.name,
            secondary: b.status.replace(/_/g, " "),
            href: "/admin/businesses",
          }))}
        />

        <Queue
          title="Emails Awaiting Approval"
          emptyText="No queued outreach emails."
          items={queuedEmails.map((m) => ({
            id: m.id,
            primary: m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "Lead",
            secondary: m.step?.subject || "Marketing sequence",
            href: "/admin/outreach",
          }))}
        />

        <Queue
          title="Online Meetings"
          emptyText="No video reviews scheduled."
          items={onlineMeetings.map((a) => ({
            id: a.id,
            primary: a.business?.name || "Practice",
            secondary: new Date(a.scheduledTime).toLocaleString(),
            href: "/admin/appointments",
          }))}
        />

        <Queue
          title="In-Person Requests"
          emptyText="No visit requests pending."
          items={inPersonRequests.map((a) => ({
            id: a.id,
            primary: a.business?.name || "Practice",
            secondary: a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : "",
            href: "/admin/appointments",
          }))}
        />
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-heading-3 font-semibold text-foreground">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-body-small text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                  <item.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body-small font-semibold text-foreground">{item.label}</p>
                  {item.detail && <p className="text-metadata text-muted-foreground">{item.detail}</p>}
                </div>
                <span className="ml-auto shrink-0 text-metadata text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: typeof IconStorefront;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="mt-3 block text-heading-2 font-bold text-foreground">{value}</span>
      <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Queue({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; href: string }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-bold text-foreground">{title}</h2>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-metadata font-bold text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-body-small text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-12 items-center justify-between gap-3 py-2.5 text-body-small hover:text-primary"
              >
                <span className="truncate font-semibold text-foreground">{item.primary}</span>
                <span className="shrink-0 text-metadata text-muted-foreground">{item.secondary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
