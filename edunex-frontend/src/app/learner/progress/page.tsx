"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatDate, formatPercentage } from "@/lib/formatters";
import { appConfig } from "@/config/app";
import { demoLessonCompletions, demoMastery, demoNextSteps } from "@/lib/demo-data";
import { progressApi, lessonsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";

function DemoBadge() {
  return (
    <span className="rounded-full bg-ivory px-2 py-0.5 text-[11px] font-medium text-text-muted">
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

  if (!learner || realMastery === null) {
    return <LoadingState label="Loading your progress…" className="py-20" />;
  }

  const realTopicIds = new Set(realMastery.map((m) => m.topicId));
  const mastery: MasteryRow[] = [...realMastery, ...demoMastery.filter((m) => !realTopicIds.has(m.topicId)).map((m) => ({ ...m, isDemo: true }))];
  const completions = [
    ...realCompletions,
    ...demoLessonCompletions.filter((c) => !realTopicIds.has(c.topicId)),
  ];
  const nextSteps = recommendations ?? demoNextSteps;

  const strengths = mastery.filter((m) => m.masteryLevel >= 70);
  const improvementAreas = mastery.filter((m) => m.masteryLevel < 60);

  return (
    <div>
      <PageHeader
        title="My Progress"
        description="Mastery and lesson completion are tracked separately — they measure different things. Mastery here is a simple accuracy-based estimate, not a scientifically validated model."
      />

      {mastery.length === 0 ? (
        <EmptyState
          title="No progress yet"
          description="Complete a lesson or a practice assessment to start building your progress history."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>Demonstrated mastery</CardTitle>
              {mastery.some((m) => m.isDemo) && <DemoBadge />}
            </div>
            <CardDescription>A simple accuracy ratio from assessment attempts, per topic.</CardDescription>
            <ul className="mt-4 flex flex-col gap-3">
              {mastery.map((item) => (
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
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>Lesson completion</CardTitle>
              {completions.length !== realCompletions.length && <DemoBadge />}
            </div>
            <CardDescription>Lessons you&apos;ve finished, independent of assessment performance.</CardDescription>
            {completions.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">No completed lessons yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                {completions.map((lesson) => (
                  <li key={lesson.topicId} className="flex items-center justify-between">
                    <span className="text-text">{lesson.topicName}</span>
                    <span className="text-text-muted">{formatDate(lesson.completedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Strengths</CardTitle>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-text">
            {strengths.length === 0 ? (
              <p className="text-text-muted">No topics above 70% mastery yet.</p>
            ) : (
              strengths.map((item) => <li key={item.topicId}>{item.topicName}</li>)
            )}
          </ul>
        </Card>
        <Card>
          <CardTitle>Areas needing improvement</CardTitle>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-text">
            {improvementAreas.length === 0 ? (
              <p className="text-text-muted">Nothing below 60% mastery right now.</p>
            ) : (
              improvementAreas.map((item) => <li key={item.topicId}>{item.topicName}</li>)
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Recommended next steps</CardTitle>
          {!recommendations && <DemoBadge />}
        </div>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {nextSteps.map((step) => (
            <li key={step.topicId + step.title} className="text-text">
              {step.title} — <span className="text-text-muted">{step.description}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
