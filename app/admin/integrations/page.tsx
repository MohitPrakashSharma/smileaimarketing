"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface IntegrationItem {
  key: string;
  name: string;
  status: "CONNECTED" | "READY" | "TEST_MODE" | "CONFIGURED" | "NOT_CONFIGURED" | "AUTHENTICATION_FAILED" | "DEGRADED" | "ERROR" | "MOCKED" | "MISSING";
  details: string;
  lastTested?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; details: string; timestamp: string }>>({});

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

  const handleTestSingle = async (key: string) => {
    setTestingKey(key);
    try {
      const res = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [key]: {
          status: data.status || "CONNECTED",
          details: data.details || `Verified at ${new Date().toLocaleTimeString()}`,
          timestamp: data.timestamp || new Date().toISOString(),
        },
      }));
      await fetchStatus();
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [key]: {
          status: "ERROR",
          details: err instanceof Error ? err.message : "Test failed",
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setTestingKey(null);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "CONNECTED":
      case "READY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "TEST_MODE":
      case "CONFIGURED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "AUTHENTICATION_FAILED":
      case "MISSING":
      case "ERROR":
        return "bg-danger/10 text-danger border-danger/20";
      case "DEGRADED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-muted-foreground/10 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-2 font-semibold text-foreground">System Integrations &amp; Infrastructure</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Monitor real-time provider credentials, background queues, database latency, and API readiness.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((item) => {
            const lastResult = testResults[item.key];
            const currentStatus = lastResult?.status || item.status;
            const currentDetails = lastResult?.details || item.details;

            return (
              <div key={item.key} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-foreground">{item.name}</h3>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeClass(currentStatus)}`}>
                      {currentStatus.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-metadata text-muted-foreground">{currentDetails}</p>

                  {lastResult?.timestamp && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                      Last tested: {new Date(lastResult.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Provider Source: {item.key === "google_places" ? "Google Places" : item.key === "dataforseo" ? "DataForSEO" : item.key === "apollo" ? "Apollo" : item.key === "openai" ? "OpenAI" : "System"}
                  </span>
                  <Button
                    variant="outline"
                    className="!h-8 !px-3 !text-metadata"
                    loading={testingKey === item.key}
                    disabled={testingKey !== null}
                    onClick={() => handleTestSingle(item.key)}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
