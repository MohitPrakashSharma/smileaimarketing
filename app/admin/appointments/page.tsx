"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  scheduledTime: string;
  address?: string;
  preferredWindow?: string;
  notes?: string;
  business?: { name: string; website: string };
  contact?: { firstName: string; lastName: string; email: string };
};

const TYPE_CLASSES: Record<string, string> = {
  ONLINE: "bg-primary/10 text-primary border border-primary/20",
  IN_PERSON: "bg-danger/10 text-danger border border-danger/20",
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch("/api/admin/appointments");
        const data = await res.json();
        if (res.ok) setAppointments(data.appointments || []);
      } catch (err) {
        console.error("Error fetching appointments:", err);
      }
    }
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Meetings</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Online reviews and in-person visit requests from unlocked audit reports.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
          No meetings scheduled yet.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 lg:hidden">
            {appointments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{a.business?.name || "Practice"}</p>
                    <p className="truncate text-metadata text-muted-foreground">
                      {a.contact?.firstName} {a.contact?.lastName} &bull; {a.contact?.email}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_CLASSES[a.type]}`}>
                    {a.type.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 border-t border-border pt-3 text-metadata text-muted-foreground">
                  {a.type === "ONLINE" ? (
                    <p>{new Date(a.scheduledTime).toLocaleString()}</p>
                  ) : (
                    <>
                      <p>{a.address || "No address specified"}</p>
                      {a.preferredWindow && <p className="mt-0.5">Window: {a.preferredWindow}</p>}
                    </>
                  )}
                  {a.notes && <p className="mt-1 italic">Notes: {a.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Business / Contact</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Scheduled</th>
                    <th className="p-4">Link / Address</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body-small">
                  {appointments.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="p-4">
                        <p className="font-semibold text-foreground">{a.business?.name || "Practice"}</p>
                        <p className="mt-0.5 text-metadata text-muted-foreground">
                          {a.contact?.firstName} {a.contact?.lastName} &bull; {a.contact?.email}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TYPE_CLASSES[a.type]}`}>
                          {a.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">
                        {a.type === "ONLINE" ? new Date(a.scheduledTime).toLocaleString() : "TBD — Sales follow-up"}
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">
                        {a.type === "ONLINE" ? (
                          <a href="https://meet.google.com/xyz-pdq-abc" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                            meet.google.com/xyz-pdq-abc
                          </a>
                        ) : (
                          a.address || "No address specified"
                        )}
                      </td>
                      <td className="p-4 text-metadata italic text-muted-foreground">
                        {a.type === "IN_PERSON" && a.preferredWindow ? `Window: ${a.preferredWindow} ` : ""}
                        {a.notes || ""}
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
