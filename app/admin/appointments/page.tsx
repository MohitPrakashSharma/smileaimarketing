"use client";

import { useEffect, useState } from "react";

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch("/api/admin/appointments");
        const data = await res.json();
        if (res.ok) {
          setAppointments(data.appointments || []);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
      }
    }
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-6 font-body">
      <div>
        <h3 className="font-display text-xl font-semibold text-white">Scheduled Consultations</h3>
        <p className="text-xs text-slate mt-1 font-body">View meeting requests and delivery addresses from online scorecard submissions.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-slate text-sm">
            No consultations or clinic visits scheduled yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate">
                  <th className="p-4">Clinic / Contact</th>
                  <th className="p-4">Consultation Type</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4">Meeting Link / Address</th>
                  <th className="p-4">Preferred Window / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div>{a.business?.name || "Clinic"}</div>
                      <div className="text-[11px] font-normal text-slate mt-0.5">{a.contact?.firstName} {a.contact?.lastName} &bull; {a.contact?.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-label text-[9px] uppercase tracking-wider ${
                        a.type === "ONLINE"
                          ? "bg-teal/10 text-teal border border-teal/20"
                          : "bg-coral/10 text-coral border border-coral/20"
                      }`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate text-xs">
                      {a.type === "ONLINE" ? new Date(a.scheduledTime).toLocaleString() : "TBD (Sales Follow-up)"}
                    </td>
                    <td className="p-4 text-slate text-xs font-mono">
                      {a.type === "ONLINE" ? (
                        <a href="https://meet.google.com/xyz-pdq-abc" target="_blank" rel="noopener noreferrer" className="hover:text-teal underline">
                          meet.google.com/xyz-pdq-abc
                        </a>
                      ) : (
                        a.address || "No address specified"
                      )}
                    </td>
                    <td className="p-4 text-slate text-xs italic">
                      {a.type === "IN_PERSON" && a.preferredWindow ? `Window: ${a.preferredWindow} ` : ""}
                      {a.notes ? `(Notes: ${a.notes})` : ""}
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
