"use client";

import { Sparkles } from "lucide-react";
import { ProgressRing } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import type { GamificationSummary } from "@/types/engagement";

/** XP level progress. Remaining XP is exact: next level threshold minus total. */
export function LevelCard({ summary }: { summary: GamificationSummary | null }) {
  if (!summary) return <Skeleton className="h-36" />;
  const span = summary.nextLevelXp - summary.levelFloorXp;
  const into = summary.xpTotal - summary.levelFloorXp;
  const remaining = summary.nextLevelXp - summary.xpTotal;
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm">
      <ProgressRing value={into} max={span} tone="gold" label={`Level ${summary.level} progress`} size={84}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">Level</span>
        <span className="text-xl font-semibold leading-none text-text">{summary.level}</span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <Sparkles className="size-3.5 text-gold" aria-hidden="true" /> Experience
        </p>
        <p className="text-2xl font-semibold tracking-tight text-text">{summary.xpTotal.toLocaleString()} XP</p>
        <p className="text-xs text-text-subtle">
          {summary.xpTotal === 0
            ? "Earn XP by finishing lessons and assessments."
            : `${remaining} XP to level ${summary.level + 1}`}
        </p>
      </div>
    </div>
  );
}
