"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type AuditResultRow = { category: string; score: number; detailsJson: unknown };
type Audit = {
  id: string;
  publicToken: string;
  status: string;
  score: number;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  results: AuditResultRow[];
  competitorGaps: { name: string; rank: number; mapScore: number | null }[];
};
type Contact = { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string | null };
type Appointment = { id: string; type: string; status: string; scheduledTime: string; address: string | null; preferredWindow: string | null };
type SalesActivity = { id: string; type: string; content: string; createdAt: string; user: { name: string } };

type BusinessDetail = {
  id: string;
  name: string;
  website: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  phone: string | null;
  category: string;
  status: string;
  opportunityScore: number;
  providerSource: string | null;
  rating: number | null;
  reviewCount: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
  campaign: { id: string; name: string } | null;
  contacts: Contact[];
  appointments: Appointment[];
  salesActivities: SalesActivity[];
  audits: Audit[];
};

const STATUS_CLASSES: Record<string, string> = {
  CONVERTED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  AUDITED: "bg-primary/10 text-primary border border-primary/20",
  OUTREACH_ACTIVE: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
};
const DEFAULT_STATUS_CLASS = "bg-muted-foreground/10 text-muted-foreground border border-border";

const CATEGORY_LABELS: Record<string, string> = {
  LOCAL_VISIBILITY: "Local Visibility",
  WEBSITE_QUALITY: "Website Quality",
  CONVERSION: "Conversion",
  REPUTATION: "Reviews & Reputation",
  COMPETITOR_GAP: "Competitor Gap",
};

export default function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/admin/businesses/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load business");
        setBusiness(json.business);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load business");
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

  if (!business) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />;
  }

  const latestAudit = business.audits[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/businesses" className="text-metadata font-semibold text-muted-foreground hover:text-primary">
          &larr; All Businesses
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-heading-2 font-semibold text-foreground">{business.name}</h1>
          <span className={`rounded-full px-3 py-1 text-metadata font-bold uppercase tracking-wider ${STATUS_CLASSES[business.status] || DEFAULT_STATUS_CLASS}`}>
            {business.status.replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-1 text-body-small text-muted-foreground">
          <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
            {business.website.replace(/^https?:\/\//, "")}
          </a>
          {" · "}
          {[business.city, business.state, business.country].filter(Boolean).join(", ")}
          {business.campaign && (
            <>
              {" · "}
              <Link href={`/admin/campaigns/${business.campaign.id}`} className="hover:text-primary hover:underline">
                {business.campaign.name}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Business information */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
          <span className="mt-1 block text-body-small font-bold text-foreground">{business.category}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Phone</span>
          <span className="mt-1 block text-body-small font-bold text-foreground">{business.phone || "—"}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Source</span>
          <span className="mt-1 block text-body-small font-bold text-foreground">{business.providerSource || "—"}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Last Checked</span>
          <span className="mt-1 block text-body-small font-bold text-foreground">
            {business.lastCheckedAt ? new Date(business.lastCheckedAt).toLocaleDateString() : "Never"}
          </span>
        </div>
      </div>

      {/* Audit status & scores */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-body font-bold text-foreground">Audit &amp; Engagement</h2>
        {!latestAudit ? (
          <p className="mt-3 text-body-small text-muted-foreground">No audit has been run for this business yet.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Overall Score</span>
                <span className="text-heading-2 font-bold text-primary">{latestAudit.score}<span className="text-body-small font-normal text-muted-foreground">/100</span></span>
              </div>
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                <span className="text-body-small font-bold text-foreground">{latestAudit.status}</span>
              </div>
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Report Views</span>
                <span className="text-body-small font-bold text-foreground">
                  {latestAudit.viewCount}
                  {latestAudit.lastViewedAt && ` (last ${new Date(latestAudit.lastViewedAt).toLocaleDateString()})`}
                </span>
              </div>
              <a
                href={`/audit/${latestAudit.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex h-9 items-center rounded-full border border-border px-4 text-metadata font-bold text-foreground hover:border-primary hover:text-primary"
              >
                View Public Report
              </a>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {latestAudit.results.map((r) => (
                <div key={r.category} className="rounded-xl border border-border bg-background p-3 text-center">
                  <span className="block text-metadata text-muted-foreground">{CATEGORY_LABELS[r.category] || r.category}</span>
                  <span className="mt-1 block font-bold text-primary">{r.score}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-body font-bold text-foreground">Contacts</h2>
          {business.contacts.length === 0 ? (
            <p className="mt-3 text-body-small text-muted-foreground">No contact captured yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {business.contacts.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="font-semibold text-foreground">{c.firstName} {c.lastName}</p>
                  <p className="text-metadata text-muted-foreground">{c.role || "Role unknown"} &bull; {c.email}</p>
                  {c.phone && <p className="text-metadata text-muted-foreground">{c.phone}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meetings */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-body font-bold text-foreground">Meetings</h2>
          {business.appointments.length === 0 ? (
            <p className="mt-3 text-body-small text-muted-foreground">No meetings requested yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {business.appointments.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{a.type.replace("_", " ")}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-metadata text-muted-foreground">
                    {a.type === "ONLINE" ? new Date(a.scheduledTime).toLocaleString() : a.address || a.preferredWindow || "Pending details"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-body font-bold text-foreground">Activity Timeline</h2>
        {business.salesActivities.length === 0 ? (
          <p className="mt-3 text-body-small text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {business.salesActivities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-body-small text-foreground">{activity.content}</p>
                  <p className="text-metadata text-muted-foreground">
                    {activity.user.name} &bull; {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
