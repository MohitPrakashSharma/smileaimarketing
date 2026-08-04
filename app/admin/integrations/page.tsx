"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface IntegrationItem {
  key: string;
  name: string;
  status: "READY" | "TEST_MODE" | "MOCKED" | "MISSING";
  details: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/integrations/status");
      const data = await res.json();
      if (res.ok) {
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch integration status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStatus]);

  const handleRunHealthTest = async () => {
    setTestRunning(true);
    setTestMessage("");
    try {
      const res = await fetch("/api/admin/integrations/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health test failed");
      setTestMessage(`Test queued successfully! Campaign ID: ${data.campaignId}`);
      setTimeout(() => void fetchStatus(), 2000);
    } catch (err: unknown) {
      setTestMessage(err instanceof Error ? err.message : "Health test failed");
    } finally {
      setTestRunning(false);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "READY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "TEST_MODE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "MOCKED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "MISSING":
        return "bg-danger/10 text-danger border-danger/20";
      default:
        return "bg-muted-foreground/10 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-2 font-semibold text-foreground">System Integrations & Infrastructure</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Monitor real-time system connections, background queues, database latency, and API keys.
          </p>
        </div>
        <Button onClick={handleRunHealthTest} loading={testRunning} disabled={testRunning}>
          Run Safe 1-Lead Pipeline Test
        </Button>
      </div>

      {testMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-body-small font-semibold text-primary">
          {testMessage}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground">{item.name}</h3>
                  <p className="mt-1 text-metadata text-muted-foreground">{item.details}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeClass(item.status)}`}>
                  {item.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
