import Link from "next/link";
import { ArrowRight, BookOpenText, ClipboardCheck, PenLine, Shapes } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/Badge";
import { buildLearnUrl, buildPracticeUrl, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { LearningPlan } from "@/types/engagement";

const ICONS: Record<string, LucideIcon> = {
  visual: Shapes,
  auditory: BookOpenText,
  read_write: PenLine,
  kinesthetic: ClipboardCheck,
};

function hrefFor(action: string, topicId: string): string {
  if (action === "practice") return buildPracticeUrl(topicId);
  if (action === "tutor") return routes.learner.tutor;
  return buildLearnUrl({ topicId });
}

export function LearningPlanList({ plan }: { plan: LearningPlan }) {
  return (
    <div>
      <ol className="flex flex-col gap-4">
        {plan.items.map((item, i) => (
          <li key={item.topicId} className="rounded-[var(--radius-md)] border border-border bg-ivory/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{i + 1}</span>
              <span className="font-medium text-text">{item.label}</span>
              {item.difficulty && <DifficultyBadge difficulty={item.difficulty} />}
            </div>
            <p className="mt-1.5 text-sm text-text-muted">{item.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.activities.slice(0, 3).map((a, ai) => {
                const Icon = ICONS[a.modality] ?? ArrowRight;
                return (
                  <Link
                    key={a.format}
                    href={hrefFor(a.action, item.topicId)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                      ai === 0 ? "border-primary bg-primary text-white hover:bg-primary-hover" : "border-border bg-card text-text hover:bg-surface-2",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {a.label}
                  </Link>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-text-subtle">{plan.note}</p>
    </div>
  );
}
