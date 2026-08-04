"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { EmptyState } from "@/components/admin/EmptyState";

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

const TABS = [
  { label: "Action Required", value: "ACTION_REQUIRED" },
  { label: "Upcoming", value: "SCHEDULED" },
  { label: "In-Person Requests", value: "IN_PERSON" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

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
    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
      {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="!h-8 text-xs sm:max-w-[200px]"
          aria-label="Confirmed visit date & time"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="!h-8 !px-3 !text-xs"
            loading={loading === "approve"}
            disabled={loading !== null}
            onClick={handleApprove}
          >
            Approve &amp; Confirm
          </Button>
          <Button
            variant="secondary"
            className="!h-8 !px-3 !text-xs"
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
  const [selectedTab, setSelectedTab] = useState("ACTION_REQUIRED");
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/appointments");
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdated = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
  };

  const filtered = appointments.filter((a) => {
    if (selectedTab === "ACTION_REQUIRED") return a.status === "REQUESTED";
    if (selectedTab === "SCHEDULED") return a.status === "SCHEDULED";
    if (selectedTab === "IN_PERSON") return a.type === "IN_PERSON";
    if (selectedTab === "COMPLETED") return a.status === "COMPLETED";
    if (selectedTab === "CANCELLED") return a.status === "CANCELLED" || a.status === "NO_SHOW";
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Meetings &amp; Consultations</h1>
          <p className="text-body-small text-muted-foreground">
            Manage online review appointments and in-person practice visit requests.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto rounded-xl border border-border bg-surface p-1 gap-1">
        {TABS.map((tab) => {
          const count = appointments.filter((a) => {
            if (tab.value === "ACTION_REQUIRED") return a.status === "REQUESTED";
            if (tab.value === "SCHEDULED") return a.status === "SCHEDULED";
            if (tab.value === "IN_PERSON") return a.type === "IN_PERSON";
            if (tab.value === "COMPLETED") return a.status === "COMPLETED";
            if (tab.value === "CANCELLED") return a.status === "CANCELLED" || a.status === "NO_SHOW";
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

      {filtered.length === 0 ? (
        <EmptyState
          title={`No meetings in ${TABS.find((t) => t.value === selectedTab)?.label}`}
          message="No appointment requests currently match this status."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm">{a.business?.name || "Practice Request"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : "Contact"} &bull; {a.contact?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${a.type === "ONLINE" ? "bg-sky-500/10 text-sky-400" : "bg-purple-500/10 text-purple-400"}`}>
                    {a.type === "ONLINE" ? "Video Consultation" : "In-Person Visit"}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-background p-3 text-xs text-muted-foreground space-y-1">
                {a.type === "ONLINE" ? (
                  <p><span className="font-bold text-foreground">Scheduled Time:</span> {new Date(a.scheduledTime).toLocaleString()}</p>
                ) : (
                  <>
                    <p><span className="font-bold text-foreground">Address:</span> {a.address || "Practice address specified in audit"}</p>
                    {a.preferredWindow && <p><span className="font-bold text-foreground">Requested Window:</span> {a.preferredWindow}</p>}
                  </>
                )}
                {a.notes && <p className="italic"><span className="font-bold text-foreground">Notes:</span> {a.notes}</p>}
              </div>

              {a.type === "IN_PERSON" && a.status === "REQUESTED" ? (
                <ApprovalControls appointment={a} onUpdated={handleUpdated} />
              ) : (
                <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
                  <ActionMenu
                    items={[
                      { label: "Mark Completed", onClick: () => alert(`Marking meeting ${a.id} completed`) },
                      { label: "Cancel Meeting", variant: "danger", onClick: () => alert(`Cancelling meeting ${a.id}`) },
                    ]}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
