"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconMenuDots } from "@/components/icons";

type AuditResultRow = { category: string; score: number; detailsJson: unknown };
type Audit = {
  id: string;
  publicToken: string;
  status: string;
  score: number;
  pdfStatus: string;
  pdfUrl: string | null;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  
  // Contact Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Principal Dentist");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/businesses/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load business");
      setBusiness(json.business);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load business");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDetail]);

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update practice status");
      setActionMessage(`Practice status updated to ${newStatus}`);
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/audits/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger audit");
      setActionMessage("Audit execution enqueued successfully!");
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Audit trigger failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, firstName, lastName, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      setActionMessage("Decision maker contact added successfully!");
      setShowContactModal(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Contact add failed");
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

  if (!business) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />;
  }

  const latestAudit = business.audits[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/businesses" className="text-metadata font-semibold text-muted-foreground hover:text-primary">
            &larr; All Businesses
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-heading-2 font-bold text-foreground">{business.name}</h1>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-metadata font-bold uppercase tracking-wider text-primary">
              {business.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-body-small text-muted-foreground">
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              {business.website.replace(/^https?:\/\//, "")}
            </a>
            {" • "}
            {[business.city, business.state, business.country].filter(Boolean).join(", ")}
          </p>
        </div>

        {/* Single Primary Action + 3-Dot Dropdown for Secondary Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowContactModal(true)}>
            + Add Contact
          </Button>

          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => setActionMenuOpen((v) => !v)}
              aria-label="More actions"
              aria-expanded={actionMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <IconMenuDots className="h-4 w-4" />
            </button>

            {actionMenuOpen && (
              <div className="animate-fade-in-down absolute right-0 top-11 z-30 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl space-y-0.5">
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    void handleUpdateStatus("VERIFIED");
                  }}
                  className="flex w-full min-h-[40px] items-center rounded-lg px-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Verify Practice
                </button>
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    void handleRunAudit();
                  }}
                  className="flex w-full min-h-[40px] items-center rounded-lg px-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  Run / Rerun Audit
                </button>
                {business.status !== "CONVERTED" && (
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      void handleUpdateStatus("CONVERTED");
                    }}
                    className="flex w-full min-h-[40px] items-center rounded-lg px-3 text-left text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
                  >
                    Mark Won
                  </button>
                )}
                {business.status !== "LOST" && (
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      void handleUpdateStatus("LOST");
                    }}
                    className="flex w-full min-h-[40px] items-center rounded-lg px-3 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-muted"
                  >
                    Mark Lost
                  </button>
                )}
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    void handleUpdateStatus("REJECTED");
                  }}
                  className="flex w-full min-h-[40px] items-center rounded-lg px-3 text-left text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-body-small font-semibold text-primary">
          {actionMessage}
        </div>
      )}

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
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">DATA SOURCE</span>
          <span className="mt-1 block text-body-small font-bold text-foreground">
            {business.providerSource === "GOOGLE_PLACES" ? "Google Places" : business.providerSource === "DATAFORSEO" ? "DataForSEO" : business.providerSource === "APOLLO" ? "Apollo" : business.providerSource === "TEST_PROVIDER" ? "Test Fixture" : "Direct Website Check"}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Opportunity Score</span>
          <span className="mt-1 block text-body-small font-bold text-primary">{business.opportunityScore}/100</span>
        </div>
      </div>

      {/* Audit status & scores */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-body font-bold text-foreground">Audit &amp; PDF Report Control</h2>
          {latestAudit && (
            <div className="flex items-center gap-2">
              <a
                href={`/audit/${latestAudit.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
              >
                View Web Report
              </a>
              <a
                href={`/api/audit/${latestAudit.publicToken}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Download PDF
              </a>
            </div>
          )}
        </div>

        {!latestAudit ? (
          <div className="py-6 text-center text-body-small text-muted-foreground">
            No audit has been run for this business yet. Click &quot;Run / Rerun Audit&quot; above to analyze practice performance.
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Overall Score</span>
                <span className="text-heading-2 font-bold text-primary">{latestAudit.score}<span className="text-body-small font-normal text-muted-foreground">/100</span></span>
              </div>
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Audit Status</span>
                <span className="text-body-small font-bold text-foreground">{latestAudit.status}</span>
              </div>
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">PDF Status</span>
                <span className="text-body-small font-bold text-foreground">{latestAudit.pdfStatus}</span>
              </div>
              <div>
                <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Report Views</span>
                <span className="text-body-small font-bold text-foreground">
                  {latestAudit.viewCount} {latestAudit.lastViewedAt ? `(Last ${new Date(latestAudit.lastViewedAt).toLocaleDateString()})` : ""}
                </span>
              </div>
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
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-body font-bold text-foreground">Decision Maker Contacts</h2>
            <button
              onClick={() => setShowContactModal(true)}
              className="text-metadata font-bold text-primary hover:underline"
            >
              + Add Contact
            </button>
          </div>
          {business.contacts.length === 0 ? (
            <p className="mt-4 text-body-small text-muted-foreground">No decision maker contact captured yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {business.contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-foreground">{c.firstName} {c.lastName}</p>
                    <p className="text-metadata text-muted-foreground">{c.role || "Principal Dentist"} • {c.email}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    VERIFIED
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meetings */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-body font-bold text-foreground">Consultations &amp; Visits</h2>
            <Link href="/admin/meetings" className="text-metadata font-bold text-primary hover:underline">
              Manage Meetings &rarr;
            </Link>
          </div>
          {business.appointments.length === 0 ? (
            <p className="mt-4 text-body-small text-muted-foreground">No meetings requested yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {business.appointments.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{a.type.replace("_", " ")}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
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

      {/* Manual Contact Add Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-heading-3 font-bold text-foreground">Add Decision Maker Contact</h3>
            <form onSubmit={handleAddContact} className="mt-4 space-y-4">
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
                >
                  <option value="Principal Dentist">Principal Dentist</option>
                  <option value="Practice Owner">Practice Owner</option>
                  <option value="Practice Manager">Practice Manager</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowContactModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={actionLoading}>
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
