"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function AdminAutomationsPage() {
  const [autoPilot, setAutoPilot] = useState(true);
  const [retryBackoff, setRetryBackoff] = useState("exponential");
  const [maxRetries, setMaxRetries] = useState(3);
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveAutomations = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setActionMessage("Automation policies updated successfully!");
      setLoading(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Campaign Automations &amp; Worker Rules</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Configure autopilot background job rules, retry policies, and queue concurrency limits.
        </p>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-body-small font-semibold text-primary">
          {actionMessage}
        </div>
      )}

      <form onSubmit={handleSaveAutomations} className="space-y-6">
        {/* Autopilot toggle */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-body font-bold text-foreground">Autopilot Funnel Execution</h2>
          <p className="mt-1 text-metadata text-muted-foreground">
            Automatically advance discovered practices from Analysis → PDF Generation → Outreach Draft upon qualification.
          </p>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-body-small text-foreground">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              checked={autoPilot}
              onChange={(e) => setAutoPilot(e.target.checked)}
            />
            Enable Autopilot Pipeline Advancement
          </label>
        </div>

        {/* Retry & Queue Settings */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-body font-bold text-foreground">BullMQ Queue Retry &amp; Backoff Policy</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-metadata font-semibold text-muted-foreground">Backoff Strategy</label>
              <select
                value={retryBackoff}
                onChange={(e) => setRetryBackoff(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
              >
                <option value="exponential">Exponential Backoff (Recommended)</option>
                <option value="fixed">Fixed Delay (5s)</option>
              </select>
            </div>

            <div>
              <label className="block text-metadata font-semibold text-muted-foreground">Max Job Retries</label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-body-small text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Save Automation Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
