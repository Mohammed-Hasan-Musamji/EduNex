"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LearningFeed } from "@/components/learner/LearningFeed";
import { Card, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatPercentage, formatRelativeTime } from "@/lib/formatters";
import { buildLearnUrl, routes } from "@/lib/routes";
import { appConfig } from "@/config/app";
import { lessonsApi, progressApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import {
  demoCurrentLearning,
  demoMastery,
  demoNextSteps,
  demoRecentActivity,
  demoStruggleAreas,
} from "@/lib/demo-data";
import type { CurrentLearningStatus, MasteryIndicator, NextStepRecommendation, StruggleArea } from "@/types/learner";

export default function DashboardPage() {
  const { learner } = useLearner();
  const [currentLearning, setCurrentLearning] = useState<CurrentLearningStatus | null>(null);
  const [mastery, setMastery] = useState<MasteryIndicator[] | null>(null);
  const [struggleAreas, setStruggleAreas] = useState<StruggleArea[] | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStepRecommendation[] | null>(null);

  useEffect(() => {
    if (!learner) return;

    void lessonsApi.listForLearner(learner.id).then((res) => {
      if (res.ok && res.data[0]) {
        const mostRecent = res.data[0];
        setCurrentLearning({
          topicId: mostRecent.topicId,
          topicName: mostRecent.topicName,
          objective: mostRecent.prompt,
          status: mostRecent.status === "ready" ? "in_progress" : "not_started",
        });
      }
    });

    void progressApi.list(learner.id).then((res) => {
      if (res.ok) {
        setMastery(res.data.map((p) => ({ topicId: p.topicId, topicName: p.topicName, masteryLevel: p.masteryEstimate })));
      }
    });

    void progressApi.recommendations(learner.id).then((res) => {
      if (res.ok) {
        setStruggleAreas(
          res.data
            .filter((r) => r.recommendationType === "review")
            .map((r) => ({ topicId: r.topicId, topicName: r.topicName, conceptName: r.label, reason: r.rationale })),
        );
        setNextSteps(
          res.data.map((r) => ({
            kind: r.recommendationType === "review" ? "review" : r.recommendationType === "practice_harder" ? "practice" : "lesson",
            title: r.label,
            description: r.rationale,
            topicId: r.topicId,
            href: buildLearnUrl({ topicId: r.topicId }),
          })),
        );
      }
    });
  }, [learner]);

  if (!learner) {
    return <LoadingState label="Loading your dashboard…" className="py-20" />;
  }

  const isMasteryReal = mastery !== null;
  const effectiveCurrentLearning = currentLearning ?? demoCurrentLearning;
  const effectiveMastery = mastery ?? demoMastery;
  const effectiveStruggleAreas = struggleAreas ?? demoStruggleAreas;
  const effectiveNextSteps = nextSteps ?? demoNextSteps;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${learner.displayName}`}
        description="Here's where your learning stands today."
        actions={
          <>
            <Link
              href={routes.learner.subjects}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3.5 py-2 text-sm font-medium text-text hover:bg-ivory"
            >
              <Compass className="size-4" aria-hidden="true" />
              Explore Subjects
            </Link>
            <Link
              href={routes.learner.learn}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Learn with AI
            </Link>
          </>
        }
      />

      <LearningFeed
        currentLearning={effectiveCurrentLearning}
        struggleAreas={effectiveStruggleAreas}
        nextSteps={effectiveNextSteps}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Progress overview</CardTitle>
            {!isMasteryReal && (
              <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {appConfig.demoDataLabel}
              </span>
            )}
          </div>
          {effectiveMastery.length === 0 ? (
            <p className="text-sm text-text-muted">No progress recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {effectiveMastery.map((item) => (
                <li key={item.topicId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text">{item.topicName}</span>
                    <span className="text-text-muted">{formatPercentage(item.masteryLevel)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${item.masteryLevel}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={routes.learner.progress}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View full progress <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-medium text-text-muted">
              {appConfig.demoDataLabel}
            </span>
          </div>
          <p className="mb-2 text-xs text-text-muted">
            There is no backend activity-log endpoint yet — see Saved Lessons and My Progress for real history.
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            {demoRecentActivity.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3">
                <span className="text-text">{activity.description}</span>
                <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(activity.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
