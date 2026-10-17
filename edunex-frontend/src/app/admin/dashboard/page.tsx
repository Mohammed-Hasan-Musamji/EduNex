"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Database, FileStack, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/formatters";
import { adminNavItems } from "@/config/navigation";
import { appConfig } from "@/config/app";
import { demoAdminStats, demoPlatformActivity } from "@/lib/demo-data";
import { adminKnowledgeBaseApi, healthApi } from "@/lib/api-client";

const healthTone = { healthy: "success", degraded: "warning", down: "error" } as const;

interface HealthRow {
  name: string;
  status: "healthy" | "degraded" | "down";
  detail: string;
}

export default function AdminDashboardPage() {
  const [documentStats, setDocumentStats] = useState<{ total: number; indexed: number } | null>(null);
  const [serviceHealth, setServiceHealth] = useState<HealthRow[] | null>(null);

  useEffect(() => {
    void adminKnowledgeBaseApi.listDocuments().then((res) => {
      if (res.ok) {
        setDocumentStats({ total: res.data.length, indexed: res.data.filter((d) => d.ingestionStatus === "indexed").length });
      }
    });

    void healthApi.readiness().then((res) => {
      if (res.ok) {
        setServiceHealth([
          {
            name: "FastAPI backend",
            status: "healthy",
            detail: "/api/v1/health/ready responding",
          },
          {
            name: "PostgreSQL",
            status: res.data.dependencies.database.ok ? "healthy" : "down",
            detail: res.data.dependencies.database.detail,
          },
          {
            name: "Gemini",
            status: res.data.dependencies.gemini.configured ? "healthy" : "down",
            detail: res.data.dependencies.gemini.detail,
          },
        ]);
      }
    });
  }, []);

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Platform health and activity at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total users" value={String(demoAdminStats.totalUsers)} icon={Users} hint={appConfig.demoDataLabel} />
        <MetricCard label="Active today" value={String(demoAdminStats.activeToday)} icon={Activity} hint={appConfig.demoDataLabel} />
        <MetricCard label="Documents indexed" value={documentStats ? String(documentStats.indexed) : "…"} icon={Database} />
        <MetricCard
          label="Total documents"
          value={documentStats ? String(documentStats.total) : "…"}
          icon={FileStack}
          hint={documentStats ? `${documentStats.total - documentStats.indexed} pending processing` : undefined}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Service health</CardTitle>
          </div>
          {serviceHealth === null ? (
            <p className="text-sm text-text-muted">Checking…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {serviceHealth.map((service) => (
                <li key={service.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-text">{service.name}</p>
                    <p className="text-xs text-text-muted">{service.detail}</p>
                  </div>
                  <StatusBadge label={service.status} tone={healthTone[service.status]} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Platform activity</CardTitle>
            <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-medium text-text-muted">
              {appConfig.demoDataLabel}
            </span>
          </div>
          <p className="mb-2 text-xs text-text-muted">No backend activity-log endpoint exists yet.</p>
          <ul className="flex flex-col gap-3 text-sm">
            {demoPlatformActivity.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3">
                <span className="text-text">{activity.description}</span>
                <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(activity.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Quick links</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {adminNavItems
            .filter((item) => item.href !== "/admin/dashboard")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-text hover:bg-ivory"
              >
                {item.label}
              </Link>
            ))}
        </div>
      </Card>
    </div>
  );
}
