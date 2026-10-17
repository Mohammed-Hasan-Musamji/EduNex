import Link from "next/link";
import { AlertTriangle, ArrowRight, Compass, GraduationCap } from "lucide-react";
import { LearningFeedCard } from "./LearningFeedCard";
import { formatPercentage } from "@/lib/formatters";
import { buildLearnUrl } from "@/lib/routes";
import type { CurrentLearningStatus, NextStepRecommendation, StruggleArea } from "@/types/learner";

interface LearningFeedProps {
  currentLearning: CurrentLearningStatus;
  struggleAreas: StruggleArea[];
  nextSteps: NextStepRecommendation[];
}

export function LearningFeed({ currentLearning, struggleAreas, nextSteps }: LearningFeedProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <LearningFeedCard
        icon={GraduationCap}
        title="What am I learning?"
        description="Your current topic and session status"
      >
        <p className="font-medium text-text">{currentLearning.topicName}</p>
        <p className="mt-1 text-sm text-text-muted">{currentLearning.objective}</p>
        {typeof currentLearning.masteryLevel === "number" && (
          <p className="mt-2 text-xs text-text-muted">
            Demonstrated mastery: {formatPercentage(currentLearning.masteryLevel)}
          </p>
        )}
        <Link
          href={buildLearnUrl({ topicId: currentLearning.topicId })}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Continue learning <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </LearningFeedCard>

      <LearningFeedCard
        icon={AlertTriangle}
        title="Where am I struggling?"
        description="Concepts that need more practice"
      >
        <ul className="flex flex-col gap-3">
          {struggleAreas.map((area) => (
            <li key={`${area.topicId}-${area.conceptName}`} className="text-sm">
              <p className="font-medium text-text">{area.conceptName}</p>
              <p className="text-xs text-text-muted">{area.reason}</p>
            </li>
          ))}
        </ul>
      </LearningFeedCard>

      <LearningFeedCard icon={Compass} title="What can I do next?" description="Recommended next step">
        <ul className="flex flex-col gap-3">
          {nextSteps.map((step) => (
            <li key={step.href}>
              <Link href={step.href} className="group flex items-start justify-between gap-2 text-sm">
                <span>
                  <span className="block font-medium text-text group-hover:text-primary">{step.title}</span>
                  <span className="block text-xs text-text-muted">{step.description}</span>
                </span>
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-text-muted group-hover:text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </LearningFeedCard>
    </div>
  );
}
