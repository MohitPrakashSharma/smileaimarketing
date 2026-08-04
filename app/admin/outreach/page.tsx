"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type OutreachMessage = {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { website: string; name?: string } };
  step?: { subject: string; bodyTemplate?: string };
};

export default function AdminOutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<OutreachMessage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [testEmailRecipient, setTestEmailRecipient] = useState("dr.jenkins@apexfamilydentistrychicago.com");

  const fetchOutreach = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outreach");
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (err) {
      console.error("Error fetching outreach:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOutreach();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOutreach]);

  const handleSendTestEmail = async () => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch("/api/admin/outreach/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: testEmailRecipient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");
      setActionMessage(`Test email sent successfully to ${testEmailRecipient} (Test Mode Transport active)`);
      await fetchOutreach();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch("/api/admin/outreach/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve outreach");
      setActionMessage("All queued outreach messages approved for dispatch.");
      await fetchOutreach();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const totalQueued = messages.filter((m) => m.status === "QUEUED" || m.status === "PENDING").length;
  const totalSent = messages.filter((m) => m.status === "SENT" || m.status === "DELIVERED").length;
  const totalOpened = messages.filter((m) => m.status === "OPENED").length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-2 font-bold text-foreground">Outreach Command Centre</h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              TEST MODE (SAFE TRANSPORT)
            </span>
          </div>
          <p className="mt-1 text-body-small text-muted-foreground">
            Review, test, approve, and control automated email sequences for practice prospects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleApproveAll} loading={actionLoading}>
            Approve All Queued Outreach
          </Button>
          <Button variant="outline" onClick={handleSendTestEmail} loading={actionLoading}>
            Send Test Email
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-body-small font-semibold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Summary Tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Queued / Pending</span>
          <span className="mt-1 block text-heading-2 font-bold text-amber-400">{totalQueued}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Sent</span>
          <span className="mt-1 block text-heading-2 font-bold text-primary">{totalSent}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Report Opened</span>
          <span className="mt-1 block text-heading-2 font-bold text-emerald-400">{totalOpened}</span>
        </div>
      </div>

      {/* Test Email Dispatch Control Box */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-body font-bold text-foreground">Send Manual Test Email</h2>
        <p className="mt-0.5 text-metadata text-muted-foreground">
          Dispatches a test audit report email through the worker test-mode transport without contacting real prospects.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            placeholder="Recipient email..."
            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
          />
          <Button onClick={handleSendTestEmail} loading={actionLoading}>
            Dispatch Test Email
          </Button>
        </div>
      </div>

      {/* Email List Table */}
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
          No outreach messages queued yet. Start a campaign or trigger an audit to populate outreach messages.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <h2 className="text-body font-bold text-foreground">Outreach Queue &amp; History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-small">
              <thead className="border-b border-border bg-surface-muted/50 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Practice Domain</th>
                  <th className="p-4">Subject Line</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-muted/30">
                    <td className="p-4 font-semibold text-foreground">
                      {m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "Lead Prospect"}
                      <div className="text-metadata text-muted-foreground">{m.contact?.email}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {m.contact?.business?.website?.replace(/^https?:\/\//, "") || "Practice domain"}
                    </td>
                    <td className="p-4 font-medium text-foreground">{m.step?.subject || "Dental Visibility Audit Executive Findings"}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedMessage(m)}
                          className="rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-primary/15 hover:text-primary"
                        >
                          Preview / Edit
                        </button>
                        <button
                          onClick={handleApproveAll}
                          className="rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Email Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-heading-3 font-bold text-foreground">Email Outreach Preview</h3>
              <button onClick={() => setSelectedMessage(null)} className="text-metadata font-bold text-muted-foreground hover:text-foreground">
                ✕ Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-body-small">
              <div>
                <span className="text-metadata font-semibold text-muted-foreground">To: </span>
                <span className="font-bold text-foreground">{selectedMessage.contact?.firstName} {selectedMessage.contact?.lastName} ({selectedMessage.contact?.email})</span>
              </div>
              <div>
                <span className="text-metadata font-semibold text-muted-foreground">Subject: </span>
                <span className="font-bold text-foreground">{selectedMessage.step?.subject || "Dental Visibility Audit Findings"}</span>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-muted-foreground">
                <p>Hello Dr. {selectedMessage.contact?.lastName || "Practice Director"},</p>
                <p className="mt-2">
                  We recently completed an executive visibility &amp; conversion audit for your practice.
                  Your estimated Opportunity Score is high, with significant upside in local map rankings and online consultation booking.
                </p>
                <p className="mt-2">
                  You can review your complete audit report and download the 2-page executive summary PDF at your convenience.
                </p>
                <p className="mt-4 font-semibold text-foreground">Best regards,<br />Smile AI Marketing Audit Team</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
              <Button onClick={() => { setSelectedMessage(null); handleApproveAll(); }}>
                Approve &amp; Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
