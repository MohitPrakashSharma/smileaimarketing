"use client";

import { useEffect, useState } from "react";

type OutreachMessage = {
  id: string;
  status: string;
  createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; business?: { website: string } };
  step?: { subject: string };
};

const STATUS_CLASSES: Record<string, string> = {
  QUEUED: "bg-muted-foreground/10 text-muted-foreground border border-border",
  SENT: "bg-primary/10 text-primary border border-primary/20",
  DELIVERED: "bg-primary/10 text-primary border border-primary/20",
};
const DEFAULT_STATUS_CLASS = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";

export default function AdminOutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);

  useEffect(() => {
    async function fetchOutreach() {
      try {
        const res = await fetch("/api/admin/outreach");
        const data = await res.json();
        if (res.ok) setMessages(data.messages || []);
      } catch (err) {
        console.error("Error fetching outreach:", err);
      }
    }
    fetchOutreach();
  }, []);

  const totalQueued = messages.filter((m) => m.status === "QUEUED").length;
  const totalSent = messages.filter((m) => m.status === "SENT" || m.status === "DELIVERED").length;
  const totalOpened = messages.filter((m) => m.status === "OPENED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Outreach</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Real-time status of campaign email correspondence.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Queued</span>
          <span className="mt-1 block text-heading-2 font-bold text-foreground">{totalQueued}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Sent</span>
          <span className="mt-1 block text-heading-2 font-bold text-primary">{totalSent}</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Opened</span>
          <span className="mt-1 block text-heading-2 font-bold text-indigo-400">{totalOpened}</span>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
          No outreach sent yet. Approve outreach from a business to seed the queue.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 lg:hidden">
            {messages.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {m.contact?.firstName} {m.contact?.lastName}
                    </p>
                    <p className="truncate text-metadata text-muted-foreground">{m.step?.subject || "Marketing sequence"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[m.status] || DEFAULT_STATUS_CLASS}`}>
                    {m.status}
                  </span>
                </div>
                <p className="mt-2 text-metadata text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Domain</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Queued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body-small">
                  {messages.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="p-4 font-semibold text-foreground">
                        {m.contact?.firstName} {m.contact?.lastName} ({m.contact?.email})
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">
                        {m.contact?.business?.website?.replace(/^https?:\/\//, "")}
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">{m.step?.subject || "Marketing sequence"}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_CLASSES[m.status] || DEFAULT_STATUS_CLASS}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-metadata text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
