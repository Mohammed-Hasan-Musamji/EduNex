import { CheckCircle2, CircleDashed, CircleDot, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { LearnerAnalytics, TopicStatus } from "@/types/engagement";

type Row = LearnerAnalytics["topicMastery"][number];

export const topicStatusMeta: Record<TopicStatus, { label: string; icon: LucideIcon; text: string; bar: string }> = {
  mastered: { label: "Mastered", icon: CheckCircle2, text: "text-success", bar: "bg-success" },
  developing: { label: "Developing", icon: CircleDot, text: "text-warning", bar: "bg-gold" },
  needs_attention: { label: "Needs attention", icon: TriangleAlert, text: "text-error", bar: "bg-error" },
  not_started: { label: "Not started", icon: CircleDashed, text: "text-text-subtle", bar: "bg-surface-3" },
};

/**
 * Per-topic mastery as horizontal bars on a shared 0-100% scale. State is
 * carried by icon + label as well as color, never color alone.
 */
export function MasteryList({ rows, threshold }: { rows: Row[]; threshold: number }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => {
        const meta = topicStatusMeta[row.status];
        const Icon = meta.icon;
        return (
          <li key={row.topicId}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-text">{row.topicName}</span>
                <DifficultyBadge difficulty={row.difficulty} />
              </div>
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.text)}>
                <Icon className="size-3.5" aria-hidden="true" />
                {meta.label}
              </span>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-surface-2" aria-hidden="true">
              {row.mastery !== null && (
                <div className={cn("h-full rounded-full transition-[width] duration-700", meta.bar)} style={{ width: `${row.mastery}%` }} />
              )}
              <span className="absolute -top-1 h-4 w-px bg-border-strong" style={{ left: `${threshold}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-text-subtle">
              {row.attempts === 0
                ? "No answers yet"
                : `${Math.round(row.mastery ?? 0)}% · ${row.correct}/${row.attempts} correct`}
              <span className="text-text-subtle"> · {row.subjectName}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
