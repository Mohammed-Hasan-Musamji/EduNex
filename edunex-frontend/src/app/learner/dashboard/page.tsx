"use client";

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
      )}
    </div>
  );
}
