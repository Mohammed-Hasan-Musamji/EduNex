"use client";

import { Flame, Info } from "lucide-react";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { GamificationSummary } from "@/types/engagement";

function streakMessage(summary: GamificationSummary): string {
  if (summary.currentStreak === 0) {
    return summary.bestStreak > 0
      ? `Your best run was ${summary.bestStreak} day${summary.bestStreak === 1 ? "" : "s"}. Any lesson or practice round starts a new one.`
      : "Complete a lesson or practice round to start a streak.";
  }
  if (!summary.activeToday) return "No activity yet today. Your streak continues if you learn before the day ends.";
  return "You've learned today.";
}

export function StreakCard({ summary, showCalendar = true }: { summary: GamificationSummary | null; showCalendar?: boolean }) {
  if (!summary) return <Skeleton className="h-36" />;
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={
              summary.currentStreak > 0
                ? "flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary"
                : "flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-subtle"
            }
          >
            <Flame className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-tight tracking-tight text-text">
              {summary.currentStreak} day{summary.currentStreak === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-text-subtle">Current streak · best {summary.bestStreak}</p>
          </div>
        </div>
        <Tooltip content={summary.streakPolicy}>
          <button
            type="button"
            aria-label="What counts as a learning day?"
            className="flex size-8 items-center justify-center rounded-md text-text-subtle hover:bg-surface-2 hover:text-text"
          >
            <Info className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <p className="mt-3 text-sm text-text-muted">{streakMessage(summary)}</p>
      {showCalendar && (
        <div className="mt-4 overflow-x-auto">
          <ActivityHeatmap
            days={summary.activityCalendar.map((d) => ({ date: d.date, count: d.activityCount }))}
            unit="activities"
            label="Learning activity over the last five weeks"
          />
        </div>
      )}
    </div>
  );
}
