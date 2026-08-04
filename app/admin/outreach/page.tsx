"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { EmptyState } from "@/components/admin/EmptyState";

type OutreachMessage = {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { website: string; name?: string } };
  step?: { subject: string; bodyTemplate?: string };
};

const TABS = [
  { label: "Awaiting Approval", value: "AWAITING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Sent", value: "SENT" },
  { label: "Engaged", value: "ENGAGED" },
  { label: "Failed", value: "FAILED" },
  { label: "Stopped", value: "STOPPED" },
];

export default function AdminOutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [selectedTab, setSelectedTab] = useState("AWAITING");
  const [previewMessage, setPreviewMessage] = useState<OutreachMessage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [testEmailRecipient, setTestEmailRecipient] = useState("hello@smileaimarketing.com");

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewMessage(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      setActionMessage(`Test email sent successfully to ${testEmailRecipient}`);
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
      setActionMessage("All queued outreach messages approved.");
      await fetchOutreach();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter by tab
  const filteredMessages = messages.filter((m) => {
    if (selectedTab === "AWAITING") return m.status === "QUEUED" || m.status === "PENDING" || m.status === "AWAITING_APPROVAL";
    if (selectedTab === "SCHEDULED") return m.status === "SCHEDULED";
    if (selectedTab === "SENT") return m.status === "SENT" || m.status === "DELIVERED";
    if (selectedTab === "ENGAGED") return m.status === "OPENED" || m.status === "CLICKED" || m.status === "REPLIED";
    if (selectedTab === "FAILED") return m.status === "FAILED" || m.status === "BOUNCED";
    if (selectedTab === "STOPPED") return m.status === "CANCELLED" || m.status === "STOPPED";
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Email Outreach</h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              SAFE DISPATCH MODE
            </span>
          </div>
          <p className="text-body-small text-muted-foreground">
            Review, approve, and track automated email outreach sequences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleApproveAll} loading={actionLoading} className="!h-9">
            Approve All Queued
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Manual Test Dispatch Control Box */}
      <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Send Test Email</h2>
            <p className="text-[11px] text-muted-foreground">Dispatch sample audit summary report to verified test address.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              placeholder="Test email..."
              className="h-8 w-60 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            />
            <Button variant="outline" onClick={handleSendTestEmail} loading={actionLoading} className="!h-8 !px-3">
              Send Test
            </Button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex overflow-x-auto rounded-xl border border-border bg-surface p-1 gap-1">
        {TABS.map((tab) => {
          const count = messages.filter((m) => {
            if (tab.value === "AWAITING") return m.status === "QUEUED" || m.status === "PENDING" || m.status === "AWAITING_APPROVAL";
            if (tab.value === "SCHEDULED") return m.status === "SCHEDULED";
            if (tab.value === "SENT") return m.status === "SENT" || m.status === "DELIVERED";
            if (tab.value === "ENGAGED") return m.status === "OPENED" || m.status === "CLICKED" || m.status === "REPLIED";
            if (tab.value === "FAILED") return m.status === "FAILED" || m.status === "BOUNCED";
            if (tab.value === "STOPPED") return m.status === "CANCELLED" || m.status === "STOPPED";
            return false;
          }).length;

          const isActive = selectedTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors min-h-[36px] ${
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {filteredMessages.length === 0 ? (
        <EmptyState
          title={`No emails in ${TABS.find((t) => t.value === selectedTab)?.label}`}
          message="No outreach messages currently match this stage."
        />
      ) : (
        <>
          {/* Mobile Cards (< 1024px) */}
          <div className="space-y-3 lg:hidden">
            {filteredMessages.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{m.contact?.business?.name || "Practice Lead"}</p>
                    <p className="text-xs text-muted-foreground">{m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "Contact pending"}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-xs text-foreground font-medium truncate">{m.step?.subject || "Dental Audit Executive Report"}</p>

                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <button
                    onClick={() => setPreviewMessage(m)}
                    className="inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
                  >
                    Preview Email
                  </button>
                  <ActionMenu
                    items={[
                      { label: "Preview Email", onClick: () => setPreviewMessage(m) },
                      { label: "Approve & Send Now", onClick: handleApproveAll },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= 1024px) */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-xs lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Practice</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Subject Line</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredMessages.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-surface-muted/30">
                      <td className="px-4 py-3 font-bold text-foreground">
                        {m.contact?.business?.name || "Practice Lead"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : "Pending"}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground truncate max-w-xs">
                        {m.step?.subject || "Executive Dental Audit Findings"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewMessage(m)}
                            className="inline-flex h-8 items-center rounded-lg bg-surface-muted px-3 text-xs font-bold text-foreground hover:bg-border"
                          >
                            Preview
                          </button>
                          <ActionMenu
                            items={[
                              { label: "Preview Email Content", onClick: () => setPreviewMessage(m) },
                              { label: "Approve & Send", onClick: handleApproveAll },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Side Panel / Modal Email Preview */}
      {previewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Email Preview</h3>
              <button onClick={() => setPreviewMessage(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-muted-foreground">To:</span> {previewMessage.contact?.firstName} {previewMessage.contact?.lastName} ({previewMessage.contact?.email})</p>
              <p><span className="font-bold text-muted-foreground">Subject:</span> {previewMessage.step?.subject || "Executive Dental Audit Findings"}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>Hello Dr. {previewMessage.contact?.lastName || "Practice Director"},</p>
              <p>
                We recently finalized an executive visibility and conversion audit for {previewMessage.contact?.business?.name || "your practice"}.
              </p>
              <p>
                Your report identifies key expansion opportunities in local Google map rankings, website load performance, and online consultation bookings.
              </p>
              <p className="font-semibold text-foreground pt-2">Best regards,<br />Smile AI Marketing Audit Team</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setPreviewMessage(null)}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewMessage(null);
                  void handleApproveAll();
                }}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Approve &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
