import { Award, Lock } from "lucide-react";
import { ProgressBar } from "@/components/ui/Progress";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AchievementStatus } from "@/types/engagement";

/** Earned achievements first; locked ones show their real requirement and progress. */
export function AchievementGrid({ achievements, limit }: { achievements: AchievementStatus[]; limit?: number }) {
  const sorted = [...achievements].sort((a, b) => Number(Boolean(b.earnedAt)) - Number(Boolean(a.earnedAt)));
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
      {shown.map((a, i) => {
        const earned = Boolean(a.earnedAt);
        return (
          <li
            key={a.code}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-md)] border p-3",
              earned ? "border-gold/40 bg-gold-soft/50" : "border-border bg-card",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                earned ? "bg-gold text-white shadow-sm" : "bg-surface-2 text-text-subtle",
              )}
            >
              {earned ? <Award className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">
                {a.title}
                <span className="sr-only">{earned ? " (earned)" : " (locked)"}</span>
              </p>
              <p className="text-xs text-text-muted">{a.description}</p>
              {earned ? (
                <p className="mt-1 text-xs text-secondary">
                  Earned {formatDate(a.earnedAt!)}
                  {a.xpReward > 0 && ` · +${a.xpReward} XP`}
                </p>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={a.progressCurrent} max={a.progressTarget} tone="gold" label={`${a.title} progress`} />
                  <span className="tabular shrink-0 text-[11px] text-text-subtle">
                    {a.progressCurrent}/{a.progressTarget}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
