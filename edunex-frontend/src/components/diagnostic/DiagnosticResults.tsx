import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, CircleDot, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/Progress";
import { buildLearnUrl, buildPracticeUrl } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ConceptStatus, DiagnosticSummary } from "@/types/engagement";

const STATUS: Record<ConceptStatus, { label: string; icon: LucideIcon; className: string }> = {
  demonstrated: { label: "Demonstrated", icon: CheckCircle2, className: "text-success" },
  developing: { label: "Developing", icon: CircleDot, className: "text-warning" },
  needs_attention: { label: "Needs attention", icon: AlertTriangle, className: "text-error" },
  not_assessed: { label: "Not assessed", icon: CircleDashed, className: "text-text-subtle" },
};

export function DiagnosticResults({ summary }: { summary: DiagnosticSummary }) {
  const rec = summary.recommendation;
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
        <ProgressRing value={summary.overallScore} tone="accent" size={112} stroke={10} label="Overall diagnostic score">
          <span className="text-2xl font-semibold text-text">{Math.round(summary.overallScore)}%</span>
          <span className="text-[11px] text-text-subtle">
            {summary.correct}/{summary.total}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-sm text-text-muted">{summary.subjectName} skills diagnostic</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-serif text-lg font-semibold text-text">
            Start at <DifficultyBadge difficulty={summary.recommendedDifficulty} />
          </p>
          <p className="mt-1 text-sm text-text-muted">{summary.recommendedDifficultyReason}</p>
          <p
            className={cn(
              "mt-3 flex items-start gap-2 rounded-md p-2.5 text-xs",
              summary.coverage.limitedEvidence ? "bg-warning-bg text-warning" : "bg-surface-2 text-text-muted",
            )}
          >
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {summary.coverage.note}
          </p>
        </div>
      </section>

      {rec && (
        <section className="rounded-[var(--radius-lg)] border border-primary/25 bg-gradient-to-br from-primary-soft to-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your next best step</p>
          <p className="mt-1 font-serif text-lg font-semibold text-text">
            {rec.activity === "lesson" ? "Learn" : "Practice"} {rec.topicName}
          </p>
          <p className="mt-1 text-sm text-text-muted">{rec.reason}</p>
          <Link
            href={rec.activity === "lesson" ? buildLearnUrl({ topicId: rec.topicId }) : buildPracticeUrl(rec.topicId)}
            className={buttonClasses("primary", "md", "mt-4")}
          >
            {rec.activity === "lesson" ? "Start the lesson" : "Start practicing"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-base font-semibold text-text">Skill map</h2>
        <ul className="mt-3 divide-y divide-border">
          {summary.topics.map((t) => {
            const meta = STATUS[t.status];
            const Icon = meta.icon;
            const gap = summary.prerequisiteGaps.includes(t.topicId);
            return (
              <li key={t.topicId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-text">{t.topicName}</span>
                  <DifficultyBadge difficulty={t.topicDifficulty} />
                  {gap && <Badge tone="error">Prerequisite gap</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {t.attempted > 0 && (
                    <span className="text-text-muted">
                      {t.correct}/{t.attempted} correct{t.limitedEvidence && " · limited evidence"}
                    </span>
                  )}
                  <span className={cn("inline-flex items-center gap-1 font-medium", meta.className)}>
                    <Icon className="size-3.5" aria-hidden="true" /> {meta.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {summary.prerequisiteGaps.length > 0 && <p className="mt-3 text-xs text-text-subtle">{summary.prerequisiteRule}</p>}
      </section>
    </div>
  );
}
