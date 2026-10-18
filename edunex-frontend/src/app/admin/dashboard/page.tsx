"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { Activity, Database, FileStack, Users, RefreshCw, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { formatRelativeTime } from "@/lib/formatters";
import { adminNavItems } from "@/config/navigation";
import { appConfig } from "@/config/app";
import { demoAdminStats, demoPlatformActivity } from "@/lib/demo-data";
import { adminKnowledgeBaseApi, healthApi } from "@/lib/api-client";
import { playClickSound, playHoverTick, playSuccessChime } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";
=======
import { Database, FileStack, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardTitle } from "@/components/ui/Card";
import { adminNavItems } from "@/config/navigation";
import { adminKnowledgeBaseApi, adminUsersApi, healthApi } from "@/lib/api-client";
>>>>>>> b5abe61 (Implemented 3)

const healthTone = { healthy: "success", degraded: "warning", down: "error" } as const;

interface HealthRow {
  name: string;
  status: "healthy" | "degraded" | "down";
  detail: string;
}

export default function AdminDashboardPage() {
  const [documentStats, setDocumentStats] = useState<{ total: number; indexed: number } | null>(null);
  const [serviceHealth, setServiceHealth] = useState<HealthRow[] | null>(null);
<<<<<<< HEAD
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    const [kbRes, healthRes] = await Promise.all([
      adminKnowledgeBaseApi.listDocuments(),
      healthApi.readiness(),
    ]);

    if (kbRes.ok) {
      setDocumentStats({
        total: kbRes.data.length,
        indexed: kbRes.data.filter((d) => d.ingestionStatus === "indexed").length,
      });
    }

    if (healthRes.ok) {
      setServiceHealth([
        {
          name: "FastAPI backend",
          status: "healthy",
          detail: "/api/v1/health/ready responding",
        },
        {
          name: "PostgreSQL",
          status: healthRes.data.dependencies.database.ok ? "healthy" : "down",
          detail: healthRes.data.dependencies.database.detail,
        },
        {
          name: "Gemini AI",
          status: healthRes.data.dependencies.gemini.configured ? "healthy" : "down",
          detail: healthRes.data.dependencies.gemini.detail,
        },
      ]);
    }
  };

  useEffect(() => {
    void loadData();
=======
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    void adminKnowledgeBaseApi.listDocuments().then((res) => {
      if (res.ok) {
        setDocumentStats({ total: res.data.length, indexed: res.data.filter((d) => d.ingestionStatus === "indexed").length });
      }
    });

    void adminUsersApi.list().then((res) => {
      if (res.ok) setUserCount(res.data.length);
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
>>>>>>> b5abe61 (Implemented 3)
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    await new Promise((res) => setTimeout(res, 500));
    setIsRefreshing(false);
    playSuccessChime();
  };

<<<<<<< HEAD
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4.5" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Admin Command Center
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Platform infrastructure telemetry, ingest pipelines, and activity at a glance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onMouseEnter={playHoverTick}
            onClick={() => {
              playClickSound();
              void handleRefresh();
            }}
            title="Refresh system metrics"
            className={cn(
              "flex items-center justify-center rounded-xl border border-border bg-card p-2 text-text-muted shadow-xs transition-all duration-200 hover:border-primary/40 hover:text-text",
              isRefreshing && "text-primary border-primary animate-pulse"
            )}
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin text-primary")} />
            <span className="sr-only">Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total users" value={String(demoAdminStats.totalUsers)} icon={Users} hint={appConfig.demoDataLabel} />
        <MetricCard label="Active today" value={String(demoAdminStats.activeToday)} icon={Activity} hint={appConfig.demoDataLabel} />
        <MetricCard
          label="Documents indexed"
          value={documentStats ? String(documentStats.indexed) : "…"}
          icon={Database}
        />
=======
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total users" value={userCount !== null ? String(userCount) : null} icon={Users} />
        <MetricCard label="Documents indexed" value={documentStats ? String(documentStats.indexed) : null} icon={Database} />
>>>>>>> b5abe61 (Implemented 3)
        <MetricCard
          label="Total documents"
          value={documentStats ? String(documentStats.total) : null}
          icon={FileStack}
          hint={documentStats ? `${documentStats.total - documentStats.indexed} pending ingestion` : undefined}
        />
      </div>

      {/* Middle Grid: Service Health & Platform Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Service Health */}
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold tracking-tight text-text">Service health</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              <span className="size-2 rounded-full bg-success animate-pulse" /> Live Telemetry
            </span>
          </div>

          {serviceHealth === null ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {serviceHealth.map((service) => (
                <li
                  key={service.name}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-ivory/40 p-3 transition-colors hover:border-primary/30 hover:bg-card"
                >
                  <div>
                    <p className="font-medium text-sm text-text">{service.name}</p>
                    <p className="text-xs text-text-muted">{service.detail}</p>
                  </div>
                  <StatusBadge label={service.status} tone={healthTone[service.status]} />
                </li>
              ))}
            </ul>
          )}
        </SpotlightCard>

<<<<<<< HEAD
        {/* Platform Activity */}
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold tracking-tight text-text">Platform activity</h3>
            <span className="rounded-full border border-border bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
              {appConfig.demoDataLabel}
            </span>
          </div>

          <p className="mb-3 text-xs text-text-muted">Recent audit actions and learner events across the system.</p>

          <ul className="flex flex-col gap-3 text-sm">
            {demoPlatformActivity.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-ivory/40 p-3 transition-colors hover:border-primary/30 hover:bg-card"
              >
                <span className="font-medium text-text">{activity.description}</span>
                <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(activity.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </SpotlightCard>
=======
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Platform activity</CardTitle>
          </div>
          <p className="text-sm text-text-muted">
            Not available yet — there is no backend activity-log endpoint to report real platform events from.
          </p>
        </Card>
>>>>>>> b5abe61 (Implemented 3)
      </div>

      {/* Quick Links */}
      <SpotlightCard className="p-6">
        <h3 className="font-serif text-lg font-semibold tracking-tight text-text">Quick management links</h3>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {adminNavItems
            .filter((item) => item.href !== "/admin/dashboard")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={playHoverTick}
                onClick={playClickSound}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-text shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-ivory hover:text-primary hover:shadow-xs"
              >
                {item.label}
              </Link>
            ))}
        </div>
      </SpotlightCard>
    </div>
  );
}
