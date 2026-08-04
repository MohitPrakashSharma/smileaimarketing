"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "PAUSED" | "RUNNING" | "FAILED";
  lastRun: string;
  nextRun: string;
  successCount: number;
  failedCount: number;
}

const INITIAL_WORKFLOWS: WorkflowItem[] = [
  {
    id: "discovery-wf",
    name: "Google Places Business Discovery",
    description: "Fetches local dental practices matching campaign criteria.",
    status: "ACTIVE",
    lastRun: "10 mins ago",
    nextRun: "In 50 mins",
    successCount: 142,
    failedCount: 0,
  },
  {
    id: "audit-wf",
    name: "Deterministic Website & SEO Audit Engine",
    description: "Evaluates SSL, response latency, mobile viewport & SEO scores.",
    status: "ACTIVE",
    lastRun: "5 mins ago",
    nextRun: "Continuous",
    successCount: 98,
    failedCount: 1,
  },
  {
    id: "pdf-wf",
    name: "PDF Light-Audit Report Generator",
    description: "Generates executive report PDFs and stores secure public URLs.",
    status: "ACTIVE",
    lastRun: "5 mins ago",
    nextRun: "On completion",
    successCount: 97,
    failedCount: 0,
  },
  {
    id: "outreach-wf",
    name: "Email Dispatch & Tracking Engine",
    description: "Dispatches approved outreach sequences and tracks opens.",
    status: "ACTIVE",
    lastRun: "2 mins ago",
    nextRun: "Every 15 mins",
    successCount: 45,
    failedCount: 0,
  },
];

export default function AdminAutomationsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(INITIAL_WORKFLOWS);
  const [autoPilot, setAutoPilot] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [actionMessage, setActionMessage] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRunNow = (id: string, name: string) => {
    setRunningId(id);
    setActionMessage("");
    setTimeout(() => {
      setActionMessage(`Triggered workflow execution for "${name}".`);
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, lastRun: "Just now", successCount: w.successCount + 1 } : w))
      );
      setRunningId(null);
    }, 600);
  };

  const toggleStatus = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const nextStatus = w.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
          setActionMessage(`Workflow "${w.name}" is now ${nextStatus.toLowerCase()}.`);
          return { ...w, status: nextStatus };
        }
        return w;
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Automations</h1>
          <p className="text-body-small text-muted-foreground">
            Manage automated discovery, audit generation, PDF rendering, and outreach workflows.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Workflows Table Container */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Last Run</th>
                <th className="px-4 py-3 text-center">Next Schedule</th>
                <th className="px-4 py-3 text-center">Success / Fail</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {workflows.map((wf) => (
                <tr key={wf.id} className="transition-colors hover:bg-surface-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-bold text-foreground">{wf.name}</p>
                    <p className="text-[11px] text-muted-foreground">{wf.description}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={wf.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{wf.lastRun}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{wf.nextRun}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-emerald-400">{wf.successCount}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-rose-400">{wf.failedCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRunNow(wf.id, wf.name)}
                        disabled={runningId !== null}
                        className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                      >
                        {runningId === wf.id ? "Triggering..." : "Run Now"}
                      </button>

                      <ActionMenu
                        items={[
                          { label: "Trigger Manual Run", onClick: () => handleRunNow(wf.id, wf.name) },
                          {
                            label: wf.status === "ACTIVE" ? "Pause Workflow" : "Resume Workflow",
                            onClick: () => toggleStatus(wf.id),
                          },
                          { label: "View Activity Log", onClick: () => alert(`Viewing log for ${wf.name}`) },
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

      {/* Global Autopilot Configuration Box */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Global Autopilot Policies</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-3 text-xs text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={autoPilot}
              onChange={(e) => {
                setAutoPilot(e.target.checked);
                setActionMessage(`Autopilot pipeline advancement set to ${e.target.checked ? "enabled" : "disabled"}.`);
              }}
            />
            <span>Enable Autopilot Pipeline Advancement</span>
          </label>

          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs text-foreground">
            <span className="text-muted-foreground">Max Automatic Job Retries:</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="h-7 w-16 rounded border border-border bg-surface px-2 text-center text-xs text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
