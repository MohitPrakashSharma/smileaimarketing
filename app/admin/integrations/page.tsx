"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminCard } from "@/components/admin/AdminCard";

interface IntegrationItem {
  key: string;
  name: string;
  status: string;
  details: string;
  lastTested?: string;
}

const GROUPS = [
  { title: "Core Infrastructure", keys: ["postgres", "redis", "worker"] },
  { title: "Lead & Enrichment Data", keys: ["google_places", "dataforseo", "apollo"] },
  { title: "Communication & AI", keys: ["email", "google_calendar", "openai"] },
  { title: "Document & PDF Storage", keys: ["pdf_storage"] },
];

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Integrations</h1>
          <p className="text-body-small text-muted-foreground">
            Monitor background services, database connectivity, and external data provider health.
          </p>
        </div>
      </div>

      {/* Grouped Status Sections */}
      <div className="space-y-5">
        {GROUPS.map((group) => {
          const items = integrations.filter((i) => group.keys.includes(i.key));
          const itemsToDisplay = items.length > 0 ? items : integrations.filter((i) => !GROUPS.some((g) => g.keys.includes(i.key)));

          if (group.title === "Document & PDF Storage" && items.length === 0) return null;

          return (
            <AdminCard key={group.title} title={group.title}>
              <div className="divide-y divide-border/60">
                {itemsToDisplay.map((item) => {
                  const lastResult = testResults[item.key];
                  const currentStatus = lastResult?.status || item.status;
                  const currentDetails = lastResult?.details || item.details;

                  return (
                    <div key={item.key} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xs font-bold text-foreground">{item.name}</h3>
                          <StatusBadge status={currentStatus} />
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{currentDetails}</p>
                        {lastResult?.timestamp && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Last tested: {new Date(lastResult.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        <Button
                          variant="outline"
                          className="!h-8 !px-3 !text-xs"
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
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
