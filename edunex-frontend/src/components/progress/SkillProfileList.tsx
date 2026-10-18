import { AlertCircle } from "lucide-react";
import { Badge, DifficultyBadge, type BadgeTone } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/formatters";
import type { EvidenceLevel, TopicSkill } from "@/types/engagement";

const EVIDENCE: Record<EvidenceLevel, { label: string; tone: BadgeTone }> = {
  none: { label: "No evidence", tone: "neutral" },
  low: { label: "Low evidence", tone: "warning" },
  medium: { label: "Medium evidence", tone: "gold" },
  high: { label: "High evidence", tone: "success" },
};

/**
 * Estimated mastery drawn as a point with an uncertainty band on a 0-100
 * track, next to the plain measured accuracy -- so "3/3 correct" visibly
 * reads as a wide estimate, not 100%.
 */
export function SkillProfileList({ topics }: { topics: TopicSkill[] }) {
  return (
    <ul className="flex flex-col gap-5">
      {topics.map((t) => {
        const low = Math.max(0, t.estimatedMastery - t.uncertainty);
        const high = Math.min(100, t.estimatedMastery + t.uncertainty);
        const evidence = EVIDENCE[t.evidenceLevel];
        return (
          <li key={t.topicId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text">{t.topicName}</span>
                <DifficultyBadge difficulty={t.difficulty} />
                <span className="text-xs text-text-subtle">{t.subjectName}</span>
              </div>
              <Badge tone={evidence.tone}>{evidence.label}</Badge>
            </div>
            <div className="relative mt-2.5 h-2.5 rounded-full bg-surface-2" aria-hidden="true">
              <span className="absolute inset-y-0 rounded-full bg-accent/25" style={{ left: `${low}%`, width: `${high - low}%` }} />
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent"
                style={{ left: `${t.estimatedMastery}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Estimated <span className="font-semibold text-text">{Math.round(t.estimatedMastery)}%</span> ± {Math.round(t.uncertainty)} ·
              measured {t.measuredAccuracy === null ? "—" : `${Math.round(t.measuredAccuracy)}%`} ({t.correct}/{t.attempts})
              {t.changeSinceFirst !== null && (
                <> · {t.changeSinceFirst >= 0 ? "+" : ""}{Math.round(t.changeSinceFirst)} since first check</>
              )}
              {t.lastAssessedAt && <> · {formatRelativeTime(t.lastAssessedAt)}</>}
            </p>
            {t.misconceptions.length > 0 && (
              <details className="mt-2 rounded-md border border-error/20 bg-error-bg/60 p-2.5 text-xs">
                <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-error">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {t.misconceptions.length} question{t.misconceptions.length === 1 ? "" : "s"} missed more than once
                </summary>
                <ul className="mt-2 flex flex-col gap-2 text-text">
                  {t.misconceptions.map((m) => (
                    <li key={m.questionId}>
                      <p className="font-medium">
                        {m.questionText} <span className="font-normal text-text-subtle">(missed {m.timesMissed}×)</span>
                      </p>
                      <p className="text-text-muted">{m.explanation}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
