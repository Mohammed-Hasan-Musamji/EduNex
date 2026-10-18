"use client";

<<<<<<< HEAD
import { useCallback, useEffect, useState } from "react";
import { DashboardGreeting } from "@/components/learner/DashboardGreeting";
import { LearningFeed } from "@/components/learner/LearningFeed";
import { ProgressOverviewCard } from "@/components/learner/ProgressOverviewCard";
import { RecentActivityCard } from "@/components/learner/RecentActivityCard";
import { DashboardSkeleton } from "@/components/learner/DashboardSkeleton";
import { AdaptiveCurriculumSection } from "@/components/learner/AdaptiveCurriculumSection";
import { GamifiedSidebarWidgets } from "@/components/learner/GamifiedSidebarWidgets";
import { lessonsApi, progressApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import { playSuccessChime } from "@/lib/audio-effects";
import { buildLearnUrl } from "@/lib/routes";
import {
  demoCurrentLearning,
  demoMastery,
  demoNextSteps,
  demoRecentActivity,
  demoStruggleAreas,
} from "@/lib/demo-data";
import type {
  CurrentLearningStatus,
  MasteryIndicator,
  NextStepRecommendation,
  StruggleArea,
} from "@/types/learner";

export default function DashboardPage() {
  const { learner, isLoading: isAuthLoading } = useLearner();
  const [currentLearning, setCurrentLearning] = useState<CurrentLearningStatus | null>(null);
  const [mastery, setMastery] = useState<MasteryIndicator[] | null>(null);
  const [struggleAreas, setStruggleAreas] = useState<StruggleArea[] | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStepRecommendation[] | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (learnerId: string) => {
    try {
      const [lessonsRes, progressRes, recsRes] = await Promise.all([
        lessonsApi.listForLearner(learnerId),
        progressApi.list(learnerId),
        progressApi.recommendations(learnerId),
      ]);

      if (lessonsRes.ok && lessonsRes.data[0]) {
        const mostRecent = lessonsRes.data[0];
        setCurrentLearning({
          topicId: mostRecent.topicId,
          topicName: mostRecent.topicName,
          objective: mostRecent.prompt,
          status: mostRecent.status === "ready" ? "in_progress" : "not_started",
        });
      }

      if (progressRes.ok) {
        setMastery(
          progressRes.data.map((p) => ({
            topicId: p.topicId,
            topicName: p.topicName,
            masteryLevel: p.masteryEstimate,
          }))
        );
      }

      if (recsRes.ok) {
        setStruggleAreas(
          recsRes.data
            .filter((r) => r.recommendationType === "review")
            .map((r) => ({
              topicId: r.topicId,
              topicName: r.topicName,
              conceptName: r.label,
              reason: r.rationale,
            }))
        );
        setNextSteps(
          recsRes.data.map((r) => ({
            kind:
              r.recommendationType === "review"
                ? "review"
                : r.recommendationType === "practice_harder"
                ? "practice"
                : "lesson",
            title: r.label,
            description: r.rationale,
            topicId: r.topicId,
            href: buildLearnUrl({ topicId: r.topicId }),
          }))
        );
      }
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!learner) return;
    void fetchDashboardData(learner.id);
  }, [learner, fetchDashboardData]);

  const handleRefresh = async () => {
    if (!learner || isRefreshing) return;
    setIsRefreshing(true);
    // Add artificial minimum delay for smooth skeleton demonstration
    const startTime = Date.now();
    await fetchDashboardData(learner.id);
    const elapsed = Date.now() - startTime;
    if (elapsed < 600) {
      await new Promise((res) => setTimeout(res, 600 - elapsed));
    }
    setIsRefreshing(false);
    playSuccessChime();
  };

  // Show skeleton loading effect during initial load
  if (isAuthLoading || (isDataLoading && !learner)) {
    return (
      <div className="py-2">
        <DashboardSkeleton />
      </div>
    );
  }

  // Fallback learner display name if still initializing
  const displayName = learner?.displayName ?? "Learner";
  const primaryVark = learner?.preferences?.varkPreferences?.[0]
    ? learner.preferences.varkPreferences[0].charAt(0).toUpperCase() +
      learner.preferences.varkPreferences[0].slice(1).replace("_", "/")
    : "Kinesthetic";

  const isMasteryReal = mastery !== null;
  const effectiveCurrentLearning = currentLearning ?? demoCurrentLearning;
  const effectiveMastery = mastery ?? demoMastery;
  const effectiveStruggleAreas = struggleAreas ?? demoStruggleAreas;
  const effectiveNextSteps = nextSteps ?? demoNextSteps;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Interactive Hero Greeting Banner with Quick Stats & Goal Actions */}
      <DashboardGreeting
        displayName={displayName}
        varkPreference={primaryVark}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* When refreshing, show crisp skeleton loader with animated shimmer */}
      {isRefreshing ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl skeleton-shimmer border border-border/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl skeleton-shimmer border border-border/60" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main 2-Column Responsive Dashboard */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left 8 Cols: Adaptive Curriculum & Learning Feed */}
            <div className="space-y-6 lg:col-span-8">
              <AdaptiveCurriculumSection />

              <LearningFeed
                currentLearning={effectiveCurrentLearning}
                struggleAreas={effectiveStruggleAreas}
                nextSteps={effectiveNextSteps}
              />
            </div>

            {/* Right 4 Cols: Gamified Widgets & Progress Overview */}
            <div className="space-y-6 lg:col-span-4">
              <GamifiedSidebarWidgets
                streakDays={3}
                xpCurrent={75}
                xpTarget={100}
                varkPreferences={learner?.preferences?.varkPreferences}
              />

              <ProgressOverviewCard
                masteryList={effectiveMastery}
                isRealData={isMasteryReal}
              />

              <RecentActivityCard activities={demoRecentActivity} />
            </div>
          </div>
        </div>
=======
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, ClipboardCheck, Compass, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AchievementGrid } from "@/components/gamification/AchievementGrid";
import { useGamification } from "@/components/gamification/GamificationProvider";
import { LevelCard } from "@/components/gamification/LevelCard";
import { StreakCard } from "@/components/gamification/StreakCard";
import { LearningPlanList } from "@/components/progress/LearningPlanList";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLearner } from "@/hooks/use-learner";
import { lessonsApi, skillsApi } from "@/lib/api-client";
import type { MappedLessonSummary } from "@/lib/api-mappers";
import { formatRelativeTime } from "@/lib/formatters";
import { buildResumeLessonUrl, routes } from "@/lib/routes";
import type { LearningPlan } from "@/types/engagement";

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export default function DashboardPage() {
  const { learner } = useLearner();
  const { summary } = useGamification();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [lessons, setLessons] = useState<MappedLessonSummary[] | null>(null);

  useEffect(() => {
    if (!learner) return;
    void skillsApi.learningPlan(learner.id).then((res) => setPlan(res.ok ? res.data : null));
    void lessonsApi.listForLearner(learner.id).then((res) => setLessons(res.ok ? res.data : []));
  }, [learner]);

  if (!learner) return null;
  const needsOnboarding = learner.onboardingStatus !== "completed";
  const resumable = lessons?.find((l) => l.status === "ready" && !l.completedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={greeting(learner.displayName)}
        description={
          summary?.activeToday
            ? "You've already learned today. Keep the momentum going, or take a break."
            : "Here's what to do next, based on your results so far."
        }
        actions={
          <Link href={routes.learner.tutor} className={buttonClasses("secondary")}>
            <BookOpenText className="size-4" aria-hidden="true" /> Ask the textbook
          </Link>
        }
      />

      {needsOnboarding && (
        <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-gold-soft/60 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {learner.onboardingStatus === "in_progress" ? "Pick up where you left off" : "Start here"}
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-text">Find your starting point in about 5 minutes</h2>
          <p className="mt-1 max-w-xl text-sm text-text-muted">
            A short adaptive diagnostic shows what you already know and where to begin, so recommendations are based on
            your answers rather than guesses.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={routes.learner.onboarding} className={buttonClasses("primary")}>
              {learner.onboardingStatus === "in_progress" ? "Continue setup" : "Get started"} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href={routes.learner.subjects} className={buttonClasses("ghost")}>
              <Compass className="size-4" aria-hidden="true" /> Explore first
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {resumable && (
            <Link
              href={buildResumeLessonUrl(resumable.id)}
              className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <PlayCircle className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-text-subtle">Continue learning · {formatRelativeTime(resumable.updatedAt)}</span>
                <span className="block truncate font-medium text-text">{resumable.lessonTitle ?? resumable.topicName}</span>
              </span>
              <ArrowRight className="size-4 text-text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}

          <Card>
            <CardTitle>Your next best steps</CardTitle>
            <CardDescription className="mb-4">From your assessment results; formats follow your learning preference.</CardDescription>
            {plan === null ? (
              <Skeleton className="h-32" />
            ) : plan.items.length === 0 ? (
              <p className="text-sm text-text-muted">No topics are available yet.</p>
            ) : (
              <LearningPlanList plan={{ ...plan, items: plan.items.slice(0, 2) }} />
            )}
            <Link href={routes.learner.progress} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See full progress <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <LevelCard summary={summary} />
          <StreakCard summary={summary} showCalendar={false} />
          <Link
            href={routes.learner.practice}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <ClipboardCheck className="size-5 text-primary" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium text-text">Quick practice round</span>
            <ArrowRight className="size-4 text-text-subtle" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {summary && summary.achievements.some((a) => a.earnedAt) && (
        <Card>
          <CardTitle>Recent achievements</CardTitle>
          <div className="mt-4">
            <AchievementGrid achievements={summary.achievements.filter((a) => a.earnedAt)} limit={4} />
          </div>
        </Card>
>>>>>>> b5abe61 (Implemented 3)
      )}
    </div>
  );
}
