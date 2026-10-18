"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { healthApi } from "@/lib/api-client";

type Tab = "analytics" | "settings";

const healthTone = { healthy: "success", degraded: "warning", down: "error" } as const;

interface HealthRow {
  name: string;
  status: "healthy" | "degraded" | "down";
  detail: string;
}

export default function AnalyticsSettingsPage() {
  const [tab, setTab] = useState<Tab>("analytics");
  const [serviceHealth, setServiceHealth] = useState<HealthRow[] | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void healthApi.readiness().then((res) => {
      if (!res.ok) return;
      setGeminiConfigured(res.data.dependencies.gemini.configured);
      setServiceHealth([
        { name: "FastAPI backend", status: "healthy", detail: "Responding" },
        { name: "PostgreSQL", status: res.data.dependencies.database.ok ? "healthy" : "down", detail: res.data.dependencies.database.detail },
        { name: "Gemini", status: res.data.dependencies.gemini.configured ? "healthy" : "down", detail: res.data.dependencies.gemini.detail },
      ]);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Platform Analytics & Settings" description="Usage insights and platform configuration." />

      <div role="tablist" aria-label="Analytics and settings" className="mb-6 flex gap-1 border-b border-border">
        {(["analytics", "settings"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium capitalize -mb-px",
              tab === value ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <div>
          <Card>
            <CardTitle>Usage analytics</CardTitle>
            <CardDescription>
              Not available yet — there is no backend aggregation endpoint for active users, session length, or
              completion/feedback rates. This section will populate once that endpoint exists; it does not show
              placeholder numbers in the meantime.
            </CardDescription>
          </Card>

          <Card className="mt-4">
            <CardTitle>Retrieval & generation quality</CardTitle>
            <CardDescription>
              Not available yet — these indicators depend on a retrieval/generation quality-metrics endpoint that
              does not exist on the backend yet.
            </CardDescription>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Model configuration</CardTitle>
            <CardDescription>Read-only until the backend exposes a settings endpoint.</CardDescription>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-text-muted">Gemini configured</dt>
              <dd className="text-text">{geminiConfigured === null ? "Checking…" : geminiConfigured ? "Yes" : "No (GEMINI_API_KEY unset)"}</dd>
              <dt className="text-text-muted">Retrieval index</dt>
              <dd className="text-text">pgvector (PostgreSQL)</dd>
            </dl>
          </Card>

          <Card>
            <CardTitle>Content processing</CardTitle>
            <CardDescription>These options are not yet backed by a real endpoint, so they&apos;re disabled.</CardDescription>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-ivory px-3 py-2 text-sm">
              <span className="text-text">Auto-retry failed document processing</span>
              <input type="checkbox" disabled aria-label="Auto-retry failed document processing (unavailable)" />
            </div>
          </Card>

          <Card>
            <CardTitle>Integration health</CardTitle>
            <ul className="mt-3 flex flex-col gap-2">
              {serviceHealth === null ? (
                <li className="text-sm text-text-muted">Checking…</li>
              ) : (
                serviceHealth.map((service) => (
                  <li key={service.name} className="flex items-center justify-between text-sm">
                    <span className="text-text">{service.name}</span>
                    <StatusBadge label={service.status} tone={healthTone[service.status]} />
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
