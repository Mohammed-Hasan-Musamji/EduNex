"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Target } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { formatPercentage } from "@/lib/formatters";
import { routes } from "@/lib/routes";
import { appConfig } from "@/config/app";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import type { MasteryIndicator } from "@/types/learner";
import { cn } from "@/lib/utils";

interface ProgressOverviewCardProps {
  masteryList: MasteryIndicator[];
  isRealData: boolean;
  className?: string;
}

export function ProgressOverviewCard({
  masteryList,
  isRealData,
  className = "",
}: ProgressOverviewCardProps) {
  const getBadgeStyle = (level: number) => {
    if (level >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (level >= 60) return "bg-primary/10 text-primary border-primary/20";
    if (level >= 30) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getTierName = (level: number) => {
    if (level >= 80) return "Advanced";
    if (level >= 60) return "Proficient";
    if (level >= 30) return "Developing";
    return "Novice";
  };

  return (
    <SpotlightCard className={cn("p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary shadow-xs transition-transform group-hover:scale-105">
            <BarChart3 className="size-4.5" />
          </span>
          <h3 className="font-serif text-lg font-semibold tracking-tight text-text">Progress overview</h3>
        </div>

        {!isRealData && (
          <span className="rounded-full border border-border bg-ivory px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
            {appConfig.demoDataLabel}
          </span>
        )}
      </div>

      <div className="flex-1">
        {masteryList.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-ivory/30 p-4 text-center">
            <Target className="size-6 text-text-muted" />
            <p className="mt-2 text-sm text-text-muted">No topic progress recorded yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {masteryList.map((item) => {
              const tier = getTierName(item.masteryLevel);
              const badgeStyle = getBadgeStyle(item.masteryLevel);

              return (
                <li
                  key={item.topicId}
                  className="group/item rounded-xl border border-border/60 bg-ivory/30 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text transition-colors group-hover/item:text-primary">
                      {item.topicName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-md border px-1.5 py-0.2 text-[10px] font-semibold", badgeStyle)}>
                        {tier}
                      </span>
                      <span className="font-semibold text-xs text-text">
                        {formatPercentage(item.masteryLevel)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-1000 ease-out group-hover/item:brightness-110"
                      style={{ width: `${item.masteryLevel}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 border-t border-border/60 pt-3">
        <Link
          href={routes.learner.progress}
          onMouseEnter={playHoverTick}
          onClick={playClickSound}
          className="group/link inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <span>View full progress analytics</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover/link:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </SpotlightCard>
  );
}
