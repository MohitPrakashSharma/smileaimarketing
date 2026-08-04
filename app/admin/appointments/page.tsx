"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Appointment = {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: "REQUESTED" | "SCHEDULED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
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

const STATUS_CLASSES: Record<string, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  SCHEDULED: "bg-primary/10 text-primary border border-primary/20",
  CANCELLED: "bg-muted-foreground/10 text-muted-foreground border border-border",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  NO_SHOW: "bg-danger/10 text-danger border border-danger/20",
};

function ApprovalControls({
  appointment,
  onUpdated,
}: {
  appointment: Appointment;
  onUpdated: (updated: Appointment) => void;
}) {
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    if (!scheduledTime) {
      setError("Pick a date & time before approving.");
      return;
    }
    setError("");
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", scheduledTime: new Date(scheduledTime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      onUpdated(data.appointment);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setError("");
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      onUpdated(data.appointment);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {error && <p className="text-metadata font-semibold text-danger">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="!h-10 sm:max-w-[220px]"
          aria-label="Confirmed visit date & time"
        />
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="!h-10 !px-4 !text-metadata"
            loading={loading === "approve"}
            disabled={loading !== null}
            onClick={handleApprove}
          >
            Approve
          </Button>
          <Button
            variant="secondary"
            className="!h-10 !px-4 !text-metadata"
            loading={loading === "reject"}
            disabled={loading !== null}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

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

  const handleUpdated = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
  };

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
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{a.business?.name || "Practice"}</p>
                  <p className="truncate text-metadata text-muted-foreground">
                    {a.contact?.firstName} {a.contact?.lastName} &bull; {a.contact?.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_CLASSES[a.type]}`}>
                    {a.type.replace("_", " ")}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-3 text-metadata text-muted-foreground">
                {a.type === "ONLINE" ? (
                  <p>{new Date(a.scheduledTime).toLocaleString()}</p>
                ) : (
                  <>
                    <p>{a.address || "No address specified"}</p>
                    {a.preferredWindow && <p className="mt-0.5">Requested window: {a.preferredWindow}</p>}
                  </>
                )}
                {a.notes && <p className="mt-1 italic">Notes: {a.notes}</p>}
              </div>

              {a.type === "IN_PERSON" && a.status === "REQUESTED" && (
                <ApprovalControls appointment={a} onUpdated={handleUpdated} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
