"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  Dumbbell,
  Sparkles,
  Target,
  Trophy,
  Flame,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatPercentage } from "@/lib/formatters";
import { appConfig } from "@/config/app";
import { routes, buildLearnUrl } from "@/lib/routes";
import { demoLessonCompletions, demoMastery, demoNextSteps } from "@/lib/demo-data";
import { progressApi, lessonsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import type { Topic } from "@/types/content";
import { cn } from "@/lib/utils";

function DemoBadge() {
  return (
    <span className="rounded-full border border-border bg-ivory px-2.5 py-0.5 text-[10px] font-semibold text-text-muted">
      {appConfig.demoDataLabel}
    </span>
  );
}

interface MasteryRow {
  topicId: string;
  topicName: string;
  masteryLevel: number;
  isDemo: boolean;
}

export default function ProgressPage() {
  const { learner } = useLearner();
  const [realMastery, setRealMastery] = useState<MasteryRow[] | null>(null);
  const [realCompletions, setRealCompletions] = useState<{ topicId: string; topicName: string; completedAt: string }[]>([]);
  const [recommendations, setRecommendations] = useState<typeof demoNextSteps | null>(null);

  useEffect(() => {
    if (!learner) return;

    void progressApi.list(learner.id).then((res) => {
      if (res.ok) {
        setRealMastery(
          res.data.map((p) => ({ topicId: p.topicId, topicName: p.topicName, masteryLevel: p.masteryEstimate, isDemo: false })),
        );
      } else {
        setRealMastery([]);
      }
    });

    void lessonsApi.listForLearner(learner.id).then((res) => {
      if (res.ok) {
        setRealCompletions(
          res.data
            .filter((s) => s.status === "ready")
            .map((s) => ({ topicId: s.topicId, topicName: s.topicName, completedAt: s.updatedAt })),
        );
      }
    });

    void progressApi.recommendations(learner.id).then((res) => {
      if (res.ok) {
        setRecommendations(
          res.data.map((r) => ({
            kind: r.recommendationType === "review" ? "review" : r.recommendationType === "practice_harder" ? "practice" : "lesson",
            title: r.label,
            description: r.rationale,
            topicId: r.topicId,
            href: "/learner/practice",
          })),
        );
      }
    });
  }, [learner]);

  const realTopicIds = new Set((realMastery ?? []).map((m) => m.topicId));
  const mastery: MasteryRow[] = [
    ...(realMastery ?? []),
    ...demoMastery.filter((m) => !realTopicIds.has(m.topicId)).map((m) => ({ ...m, isDemo: true })),
  ];
  const completions = [
    ...realCompletions,
    ...demoLessonCompletions.filter((c) => !realTopicIds.has(c.topicId)),
  ];
  const nextSteps = recommendations ?? demoNextSteps;

  const strengths = mastery.filter((m) => m.masteryLevel >= 70);
  const improvementAreas = mastery.filter((m) => m.masteryLevel < 60);

  const averageMastery =
    mastery.length > 0
      ? Math.round(mastery.reduce((acc, curr) => acc + curr.masteryLevel, 0) / mastery.length)
      : 0;

  const getTier = (level: number) => {
    if (level >= 80) return { label: "Advanced", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
    if (level >= 60) return { label: "Proficient", badge: "bg-primary/15 text-primary border-primary/30" };
    return { label: "Developing", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs backdrop-blur-xl transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <BarChart3 className="size-5" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
              My Progress & Mastery
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Track demonstrated mastery, lesson completions, and adaptive recommendations in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-ivory px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs">
            <Award className="size-3.5 text-primary" />
            Tier: {averageMastery >= 75 ? "Expert" : averageMastery >= 50 ? "Proficient" : "Foundational"}
          </span>
        </div>
      </div>

      {/* 3 Metric Cards Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard className="p-5 flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25">
            <Target className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Average Mastery</p>
            <p className="font-serif text-2xl font-bold tracking-tight text-text">
              {formatPercentage(averageMastery)}
            </p>
            <p className="text-[11px] text-text-muted">Across {mastery.length} topics</p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-xs ring-1 ring-secondary/25">
            <CheckCircle2 className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Lessons Completed</p>
            <p className="font-serif text-2xl font-bold tracking-tight text-text">{completions.length}</p>
            <p className="text-[11px] text-text-muted">Finished modules</p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/25">
            <Award className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Demonstrated Strengths</p>
            <p className="font-serif text-2xl font-bold tracking-tight text-text">{strengths.length}</p>
            <p className="text-[11px] text-text-muted">Topics &gt; 70% recall</p>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Grid: Demonstrated Mastery & Lesson Completion */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Data Structures Mastery Breakdown (from Screenshot 2) */}
        <SpotlightCard className="p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="size-4" />
              </span>
              <h2 className="font-serif text-lg font-bold tracking-tight text-text">Data Structures Mastery Breakdown</h2>
            </div>
            {mastery.some((m) => m.isDemo) && <DemoBadge />}
          </div>
          <p className="text-xs text-text-muted mb-4">
            Ground truth statistics derived directly from your assessment attempts and completed whiteboard lessons.
          </p>

          <ul className="flex flex-col gap-4">
            {mastery.map((item) => {
              const tier = getTier(item.masteryLevel);
              return (
                <li
                  key={item.topicId}
                  className="group/topic rounded-2xl border border-border/60 bg-ivory/30 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-text group-hover/topic:text-primary transition-colors">
                      {item.topicName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase", tier.badge)}>
                        {tier.label}
                      </span>
                      <span className="font-bold text-text text-sm">
                        {formatPercentage(item.masteryLevel)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-border/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-1000 ease-out group-hover/topic:brightness-110"
                      style={{ width: `${item.masteryLevel}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex justify-end">
                    <Link
                      href={routes.learner.practice}
                      onMouseEnter={playHoverTick}
                      onClick={playClickSound}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Practice quiz</span>
                      <ArrowRight className="size-3 transition-transform group-hover/topic:translate-x-0.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </SpotlightCard>

        {/* Weekly Activity Ledger (from Screenshot 2) */}
        <SpotlightCard className="p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  <Flame className="size-4 fill-orange-500" />
                </span>
                <h2 className="font-serif text-lg font-bold tracking-tight text-text">Weekly Activity Ledger</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <Flame className="size-3.5 fill-orange-500 animate-pulse" />
                3 Day Active Streak
              </span>
            </div>

            <p className="text-xs text-text-muted mb-5">
              Daily diagnostic and lesson completion velocity across the current study week.
            </p>

            {/* 7 Days Row */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 py-2 text-center">
              {[
                { day: "Mon", icon: "✓", active: true, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold" },
                { day: "Tue", icon: "✓", active: true, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold" },
                { day: "Wed", icon: "⚡", active: true, color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 ring-2 ring-amber-500/30 scale-105 font-bold" },
                { day: "Thu", icon: "—", active: false, color: "bg-card border-border/60 text-text-muted/40" },
                { day: "Fri", icon: "—", active: false, color: "bg-card border-border/60 text-text-muted/40" },
                { day: "Sat", icon: "—", active: false, color: "bg-card border-border/60 text-text-muted/40" },
                { day: "Sun", icon: "—", active: false, color: "bg-card border-border/60 text-text-muted/40" },
              ].map((slot) => (
                <div key={slot.day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-text-muted">{slot.day}</span>
                  <span
                    className={cn(
                      "flex size-9 sm:size-10 items-center justify-center rounded-2xl border text-xs shadow-2xs transition-all",
                      slot.color
                    )}
                  >
                    {slot.icon}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-text-muted">
            <p>
              <span className="font-bold text-text">Next Milestone:</span> Learn tomorrow to unlock the <span className="font-semibold text-primary">&ldquo;Consistent Learner&rdquo;</span> 4-day badge!
            </p>
          </div>
        </SpotlightCard>
      </div>

      {/* Lesson Completion & Strengths Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lesson Completion */}
        <SpotlightCard className="p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <BookOpen className="size-4" />
              </span>
              <h2 className="font-serif text-lg font-bold tracking-tight text-text">Lesson completion</h2>
            </div>
            {completions.length !== realCompletions.length && <DemoBadge />}
          </div>
          <p className="text-xs text-text-muted mb-4">
            Curriculum modules completed independent of assessment accuracy scores.
          </p>

          {completions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-ivory/20 text-center p-4">
              <BookOpen className="size-8 text-text-muted mb-2" />
              <p className="text-sm font-semibold text-text">No completed lessons yet</p>
              <p className="text-xs text-text-muted mt-1">Start a lesson to begin your learning log.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {completions.map((lesson) => (
                <li
                  key={lesson.topicId}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-ivory/30 p-3.5 transition-all hover:border-primary/30 hover:bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-success/15 text-success">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <span className="font-semibold text-sm text-text">{lesson.topicName}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Calendar className="size-3.5" />
                    {formatDate(lesson.completedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SpotlightCard>
      </div>

      {/* Strengths & Improvement Areas Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Strengths */}
        <SpotlightCard className="p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Trophy className="size-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-text">Demonstrated Strengths</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">Topics with &gt; 70% demonstrated mastery retention.</p>

          {strengths.length === 0 ? (
            <p className="text-xs text-text-muted italic">Complete more practice sets to unlock strengths.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {strengths.map((item) => (
                <span
                  key={item.topicId}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs"
                >
                  <Sparkles className="size-3.5" />
                  <span>{item.topicName}</span>
                  <span className="rounded-md bg-white/40 dark:bg-black/20 px-1.5 py-0.2 text-[10px]">
                    {formatPercentage(item.masteryLevel)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </SpotlightCard>

        {/* Improvement Areas */}
        <SpotlightCard className="p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-text">Areas Needing Practice</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">Concepts below 60% mastery where targeted practice is advised.</p>

          {improvementAreas.length === 0 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-success">
              <CheckCircle2 className="size-4" />
              <span>Great work! All your active topics are above 60% mastery.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {improvementAreas.map((item) => (
                <div
                  key={item.topicId}
                  className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs"
                >
                  <span className="font-bold text-amber-800 dark:text-amber-200">{item.topicName}</span>
                  <Link
                    href={routes.learner.practice}
                    onMouseEnter={playHoverTick}
                    onClick={playClickSound}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-2.5 py-1 font-bold shadow-2xs hover:bg-amber-700 transition-colors"
                  >
                    <Dumbbell className="size-3" /> Practice
                  </Link>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>
      </div>

      {/* Recommended Next Steps */}
      <SpotlightCard className="p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Compass className="size-4" />
            </span>
            <h2 className="font-serif text-lg font-bold tracking-tight text-text">Recommended Next Steps</h2>
          </div>
          {!recommendations && <DemoBadge />}
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {nextSteps.map((step) => (
            <li key={step.topicId + step.title}>
              <Link
                href={step.href ?? routes.learner.practice}
                onMouseEnter={playHoverTick}
                onClick={playClickSound}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-ivory/30 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md"
              >
                <div>
                  <span className="block font-bold text-sm text-text group-hover:text-primary transition-colors">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                    {step.description}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-primary">
                  <span>Start action</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </SpotlightCard>
    </div>
  );
}
