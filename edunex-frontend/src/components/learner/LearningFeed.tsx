"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  Sparkles,
  BookOpen,
  Target,
  Dumbbell,
} from "lucide-react";
import { LearningFeedCard } from "./LearningFeedCard";
import { formatPercentage } from "@/lib/formatters";
import { buildLearnUrl, routes } from "@/lib/routes";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import type { CurrentLearningStatus, NextStepRecommendation, StruggleArea } from "@/types/learner";
import { cn } from "@/lib/utils";

interface LearningFeedProps {
  currentLearning: CurrentLearningStatus;
  struggleAreas: StruggleArea[];
  nextSteps: NextStepRecommendation[];
}

export function LearningFeed({ currentLearning, struggleAreas, nextSteps }: LearningFeedProps) {
  const mastery = currentLearning.masteryLevel ?? 62;

  const getMasteryTier = (level: number) => {
    if (level >= 80) return { label: "Advanced", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (level >= 50) return { label: "Proficient", color: "text-primary bg-primary/10 border-primary/20" };
    return { label: "Developing", color: "text-amber-600 bg-amber-50 border-amber-200" };
  };

  const tier = getMasteryTier(mastery);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* 1. What am I learning? */}
      <LearningFeedCard
        icon={GraduationCap}
        title="What am I learning?"
        description="Your current topic and session status"
        badge={currentLearning.status === "in_progress" ? "In Progress" : "Active"}
        badgeTone="primary"
      >
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              <h4 className="text-base font-semibold text-text tracking-tight">{currentLearning.topicName}</h4>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-text-muted">{currentLearning.objective}</p>

            {/* Mastery Level Gauge */}
            <div className="mt-4 rounded-xl border border-border/70 bg-ivory/50 p-3.5 transition-colors group-hover:border-primary/30">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" /> Demonstrated mastery
                </span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", tier.color)}>
                  {formatPercentage(mastery)} • {tier.label}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-border/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-1">
            <Link
              href={buildLearnUrl({ topicId: currentLearning.topicId })}
              onMouseEnter={playHoverTick}
              onClick={playClickSound}
              className="group/btn inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20"
            >
              <span>Continue learning</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </LearningFeedCard>

      {/* 2. Where am I struggling? */}
      <LearningFeedCard
        icon={AlertTriangle}
        title="Where am I struggling?"
        description="Concepts that need more practice"
        badge={struggleAreas.length > 0 ? `${struggleAreas.length} Concepts` : "All Clear"}
        badgeTone={struggleAreas.length > 0 ? "warning" : "success"}
      >
        {struggleAreas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-ivory/30 p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-success/15 text-success shadow-xs">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="mt-3 font-medium text-sm text-text">No struggle areas detected</p>
            <p className="mt-1 text-xs text-text-muted max-w-[220px]">
              You are retaining key concepts effectively! Keep testing your recall.
            </p>
            <Link
              href={routes.learner.practice}
              onMouseEnter={playHoverTick}
              onClick={playClickSound}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text hover:bg-ivory hover:border-primary/40 transition-colors"
            >
              <Dumbbell className="size-3.5 text-primary" /> Test Knowledge
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {struggleAreas.map((area) => (
              <li
                key={`${area.topicId}-${area.conceptName}`}
                className="group/item rounded-xl border border-border/80 bg-ivory/40 p-3.5 transition-all duration-200 hover:border-warning/40 hover:bg-warning/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-text tracking-tight group-hover/item:text-warning transition-colors">
                      {area.conceptName}
                    </p>
                    <p className="mt-1 text-xs text-text-muted leading-relaxed">{area.reason}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end">
                  <Link
                    href={buildLearnUrl({ topicId: area.topicId })}
                    onMouseEnter={playHoverTick}
                    onClick={playClickSound}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Review concept <ArrowRight className="size-3 transition-transform group-hover/item:translate-x-0.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </LearningFeedCard>

      {/* 3. What can I do next? */}
      <LearningFeedCard
        icon={Compass}
        title="What can I do next?"
        description="Recommended next step"
        badge="AI Curated"
        badgeTone="primary"
      >
        <ul className="flex flex-col gap-3">
          {nextSteps.map((step) => {
            const isPractice = step.kind === "practice";
            const StepIcon = isPractice ? Dumbbell : step.kind === "review" ? Sparkles : BookOpen;

            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  onMouseEnter={playHoverTick}
                  onClick={playClickSound}
                  className="group/step flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-ivory/40 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover/step:scale-110">
                      <StepIcon className="size-4" />
                    </span>
                    <div>
                      <span className="block font-semibold text-sm text-text transition-colors group-hover/step:text-primary">
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                        {step.description}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-text-muted transition-all duration-200 group-hover/step:translate-x-1 group-hover/step:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </LearningFeedCard>
    </div>
  );
}
