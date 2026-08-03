"use client";

import { useEffect, useState } from "react";

export default function AdminOutreachPage() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOutreach() {
      try {
        const res = await fetch("/api/admin/outreach");
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages || []);
        }
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
    <div className="space-y-6 font-body">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Queued Messages</span>
          <span className="font-display text-2xl font-bold text-white mt-1 block">{totalQueued}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Sent / Delivered</span>
          <span className="font-display text-2xl font-bold text-teal mt-1 block">{totalSent}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Opened By Leads</span>
          <span className="font-display text-2xl font-bold text-indigo-400 mt-1 block">{totalOpened}</span>
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl font-semibold text-white">Sequence Message Logs</h3>
        <p className="text-xs text-slate mt-1 font-body">Real-time status tracking of all campaign outreach correspondence.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate text-sm">
            No outreach sequences initiated. Run an audit and approve outreach to seed the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate">
                  <th className="p-4">Recipient Contact</th>
                  <th className="p-4">Clinic Domain</th>
                  <th className="p-4">Email Subject</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Queued Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">{m.contact?.firstName} {m.contact?.lastName} ({m.contact?.email})</td>
                    <td className="p-4 text-slate text-xs">{m.contact?.business?.website?.replace("https://", "").replace("http://", "")}</td>
                    <td className="p-4 text-slate text-xs">{m.step?.subject || "Marketing Sequence"}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-label text-[9px] uppercase tracking-wider ${
                        m.status === "QUEUED"
                          ? "bg-slate/10 text-slate border border-white/10"
                          : m.status === "SENT" || m.status === "DELIVERED"
                          ? "bg-teal/10 text-teal border border-teal/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
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
