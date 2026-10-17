"use client";

import { Activity, BookOpen, Clock, Dumbbell, Sparkles } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { formatRelativeTime } from "@/lib/formatters";
import { appConfig } from "@/config/app";
import type { RecentActivity } from "@/types/learner";
import { cn } from "@/lib/utils";

interface RecentActivityCardProps {
  activities: RecentActivity[];
  className?: string;
}

export function RecentActivityCard({ activities, className = "" }: RecentActivityCardProps) {
  const getActivityIcon = (desc: string) => {
    const lower = desc.toLowerCase();
    if (lower.includes("practice")) return Dumbbell;
    if (lower.includes("lesson")) return BookOpen;
    return Sparkles;
  };

  return (
    <SpotlightCard className={cn("p-6", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs transition-transform group-hover:scale-105">
            <Activity className="size-4.5" />
          </span>
          <h3 className="font-serif text-lg font-semibold tracking-tight text-text">Recent activity</h3>
        </div>

        <span className="rounded-full border border-border bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
          {appConfig.demoDataLabel}
        </span>
      </div>

      <p className="mb-4 text-xs text-text-muted">
        Real-time telemetry and engagement feed across your recent learning sessions.
      </p>

      <div className="flex-1">
        <div className="relative pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-border/80">
          <ul className="flex flex-col gap-4">
            {activities.map((act) => {
              const Icon = getActivityIcon(act.description);
              return (
                <li key={act.id} className="group/item relative flex items-start justify-between gap-3 text-sm">
                  {/* Timeline Glowing Node */}
                  <span className="absolute -left-6 top-1 flex size-5 -translate-x-[1px] items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-xs transition-transform duration-200 group-hover/item:scale-125">
                    <span className="size-1.5 rounded-full bg-white" />
                  </span>

                  <div className="flex-1 rounded-xl border border-border/50 bg-ivory/30 p-2.5 transition-all duration-200 group-hover/item:border-primary/40 group-hover/item:bg-card">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-primary shrink-0" />
                      <span className="font-medium text-text transition-colors group-hover/item:text-primary">
                        {act.description}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 pt-2 flex items-center gap-1 text-[11px] text-text-muted">
                    <Clock className="size-3" />
                    {formatRelativeTime(act.occurredAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SpotlightCard>
  );
}
