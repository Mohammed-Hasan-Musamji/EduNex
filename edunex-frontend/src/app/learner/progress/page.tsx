
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatDate, formatPercentage } from "@/lib/formatters";
import { progressApi, lessonsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";

interface MasteryRow {
  topicId: string;
  topicName: string;
  masteryLevel: number;
}

interface CompletionRow {
  topicId: string;
  topicName: string;
  completedAt: string;
}

interface Recommendation {
  kind: "review" | "practice" | "lesson";
  title: string;
  description: string;
  topicId: string;
  href: string;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getMasteryLabel(value: number) {
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Strong";
  if (value >= 60) return "Developing";
  return "Needs practice";
}

function getMasteryColor(value: number) {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-primary";
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-text sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm leading-6 text-text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  accent: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-card">
      <div
        className={`absolute -right-5 -top-5 h-24 w-24 rounded-full opacity-60 blur-2xl ${accent}`}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-text">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ivory text-xl">
          <span aria-hidden="true">{icon}</span>
        </div>
      </div>
    </Card>
  );
}

function MasteryBar({ item }: { item: MasteryRow }) {
  const score = clamp(item.masteryLevel);

  return (
    <li className="rounded-2xl border border-border/70 bg-white p-4 transition hover:border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-text">
            {item.topicName}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {getMasteryLabel(score)}
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums text-text">
          {formatPercentage(score)}
        </span>
      </div>

      <div
        className="progress-track mt-3 h-2.5"
        role="progressbar"
        aria-label={`${item.topicName} mastery`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className={`progress-fill ${getMasteryColor(score)}`}
          style={{
            width: `${score}%`,
            animationDelay: "100ms",
          }}
        />
      </div>
    </li>
  );
}

function MasteryChart({ mastery }: { mastery: MasteryRow[] }) {
  const chartItems = [...mastery]
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .slice(0, 6);

  if (chartItems.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center">
        <span className="text-3xl" aria-hidden="true">📊</span>
        <p className="mt-3 text-sm font-semibold text-text">
          Your chart starts here
        </p>
        <p className="mt-1 max-w-xs text-sm text-text-muted">
          Complete assessments to see your topic mastery visualized here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {chartItems.map((item, index) => {
        const score = clamp(item.masteryLevel);

        return (
          <div key={item.topicId}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-text">
                {item.topicName}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-text-muted">
                {formatPercentage(score)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-border/70">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-out"
                style={{
                  width: `${score}%`,
                  background:
                    index === 0
                      ? "#427b58"
                      : index === 1
                        ? "#bd6548"
                        : index === 2
                          ? "#9870c5"
                          : index === 3
                            ? "#e7b84d"
                            : "#7eaa91",
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-text-muted">
        Showing up to six topics, ranked by recorded mastery. This is an
        accuracy-based estimate, not a validated ability score.
      </p>
    </div>
  );
}

export default function ProgressPage() {
  const { learner } = useLearner();

  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [masteryError, setMasteryError] = useState(false);
  const [lessonsError, setLessonsError] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(false);

  useEffect(() => {
    if (!learner) return;

    let cancelled = false;

    async function loadProgress() {
      setLoading(true);
      setMasteryError(false);
      setLessonsError(false);
      setRecommendationsError(false);

      const [masteryResult, lessonsResult, recommendationsResult] =
        await Promise.allSettled([
          progressApi.list(learner!.id),
          lessonsApi.listForLearner(learner!.id),
          progressApi.recommendations(learner!.id),
        ]);

      if (cancelled) return;

      if (masteryResult.status === "fulfilled" && masteryResult.value.ok) {
        setMastery(
          masteryResult.value.data.map((item) => ({
            topicId: item.topicId,
            topicName: item.topicName,
            masteryLevel: clamp(item.masteryEstimate),
          })),
        );
      } else {
        setMastery([]);
        setMasteryError(true);
      }

      if (lessonsResult.status === "fulfilled" && lessonsResult.value.ok) {
        setCompletions(
          lessonsResult.value.data
            .filter((lesson) => lesson.status === "ready")
            .map((lesson) => ({
              topicId: lesson.topicId,
              topicName: lesson.topicName,
              completedAt: lesson.updatedAt,
            })),
        );
      } else {
        setCompletions([]);
        setLessonsError(true);
      }

      if (
        recommendationsResult.status === "fulfilled" &&
        recommendationsResult.value.ok
      ) {
        setRecommendations(
          recommendationsResult.value.data.map((item) => ({
            kind:
              item.recommendationType === "review"
                ? "review"
                : item.recommendationType === "practice_harder"
                  ? "practice"
                  : "lesson",
            title: item.label,
            description: item.rationale,
            topicId: item.topicId,
            href: "/learner/practice",
          })),
        );
      } else {
        setRecommendations([]);
        setRecommendationsError(true);
      }

      setLoading(false);
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [learner]);

  const stats = useMemo(() => {
    const average =
      mastery.length > 0
        ? Math.round(
            mastery.reduce((sum, item) => sum + item.masteryLevel, 0) /
              mastery.length,
          )
        : null;

    return {
      average,
      topicsTracked: mastery.length,
      strengths: mastery.filter((item) => item.masteryLevel >= 70),
      improvementAreas: mastery.filter((item) => item.masteryLevel < 60),
    };
  }, [mastery]);

  if (!learner || loading) {
    return <LoadingState label="Loading your learning journey…" className="py-20" />;
  }

  const hasAnyData =
    mastery.length > 0 || completions.length > 0 || recommendations.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <PageHeader
        title="My Progress"
        description="See what you have mastered, discover where to improve, and decide what to learn next."
      />

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#713f30] via-[#9d543c] to-[#bd6548] p-6 text-white shadow-lg sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-5 -top-9 h-44 w-44 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <span aria-hidden="true">✦</span>
              YOUR LEARNING JOURNEY
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Every step forward counts.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              Review your recorded results, celebrate your strengths, and focus
              on the topics that need more practice.
            </p>
            <Link
              href="/learner/practice"
              className="primary-glow mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#713f30] transition hover:-translate-y-0.5"
            >
              Continue practicing <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/25 bg-white/10 text-5xl shadow-inner backdrop-blur sm:h-36 sm:w-36 sm:text-6xl">
            <span aria-hidden="true">🎯</span>
          </div>
        </div>
      </section>

      {/* API errors */}
      {(masteryError || lessonsError || recommendationsError) && (
        <div
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          <p className="font-semibold">Some progress information is unavailable.</p>
          <p className="mt-1 leading-6">
            We could not load every section. Displayed values use available
            backend results only; missing information is not replaced with
            sample data.
          </p>
        </div>
      )}

      {/* Summary metrics */}
      <section>
        <SectionHeading
          eyebrow="At a glance"
          title="Your learning snapshot"
          description="A summary of the progress data currently available for your account."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Average mastery"
            value={stats.average === null ? "—" : `${stats.average}%`}
            detail={
              stats.average === null
                ? "No assessment mastery recorded yet"
                : "Average across topics with recorded results"
            }
            icon="📈"
            accent="bg-emerald-200"
          />
          <SummaryCard
            label="Topics tracked"
            value={stats.topicsTracked}
            detail="Topics with recorded mastery"
            icon="🧠"
            accent="bg-violet-200"
          />
          <SummaryCard
            label="Lessons completed"
            value={lessonsError ? "—" : completions.length}
            detail={
              lessonsError
                ? "Lesson data unavailable"
                : "Lessons returned by your learning history"
            }
            icon="📚"
            accent="bg-amber-200"
          />
          <SummaryCard
            label="Strong topics"
            value={stats.strengths.length}
            detail="Topics with mastery at or above 70%"
            icon="🏆"
            accent="bg-rose-200"
          />
        </div>
      </section>

      {!hasAnyData && !masteryError && !lessonsError && !recommendationsError ? (
        <EmptyState
          title="Your learning story starts here"
          description="Complete a lesson or practice assessment. Once results are recorded, your mastery, learning history, and recommendations will appear here."
        />
      ) : (
        <>
          {/* Mastery chart and detailed topic mastery */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <SectionHeading
                eyebrow="Visual analytics"
                title="Mastery overview"
                description="Compare your recorded topic mastery at a glance."
              />
              <MasteryChart mastery={mastery} />
            </Card>

            <Card>
              <SectionHeading
                eyebrow="Topic breakdown"
                title="Demonstrated mastery"
                description="An accuracy-based estimate from your recorded assessment results."
              />
              {masteryError ? (
                <p className="text-sm text-text-muted">
                  Topic mastery could not be loaded.
                </p>
              ) : mastery.length === 0 ? (
                <p className="rounded-xl bg-ivory p-4 text-sm leading-6 text-text-muted">
                  No mastery results have been recorded yet. Try a practice
                  assessment to start building your topic history.
                </p>
              ) : (
                <ul className="space-y-3">
                  {mastery.map((item) => (
                    <MasteryBar key={item.topicId} item={item} />
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* Strengths and gaps */}
          <section>
            <SectionHeading
              eyebrow="Your next breakthrough"
              title="Strengths and opportunities"
              description="Use these results to decide where to focus your next study session."
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                    <span aria-hidden="true">🌟</span>
                  </div>
                  <div>
                    <CardTitle>Your strengths</CardTitle>
                    <CardDescription>
                      Topics with at least 70% recorded mastery.
                    </CardDescription>
                  </div>
                </div>

                {stats.strengths.length === 0 ? (
                  <p className="mt-5 rounded-xl bg-ivory p-4 text-sm leading-6 text-text-muted">
                    {mastery.length === 0
                      ? "Strengths will appear when assessment results are available."
                      : "No topic has reached 70% mastery yet. Keep practicing and check back after your next assessment."}
                  </p>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {stats.strengths.map((item) => (
                      <li
                        key={item.topicId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50/70 p-3"
                      >
                        <span className="text-sm font-medium text-text">
                          {item.topicName}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-emerald-700">
                          {formatPercentage(item.masteryLevel)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                    <span aria-hidden="true">🧭</span>
                  </div>
                  <div>
                    <CardTitle>Areas to improve</CardTitle>
                    <CardDescription>
                      Topics with less than 60% recorded mastery.
                    </CardDescription>
                  </div>
                </div>

                {stats.improvementAreas.length === 0 ? (
                  <p className="mt-5 rounded-xl bg-ivory p-4 text-sm leading-6 text-text-muted">
                    {mastery.length === 0
                      ? "Your improvement areas will appear after mastery results are recorded."
                      : "No topics are currently below 60% mastery. Review your results regularly to maintain your understanding."}
                  </p>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {stats.improvementAreas.map((item) => (
                      <li
                        key={item.topicId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 p-3"
                      >
                        <span className="text-sm font-medium text-text">
                          {item.topicName}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-amber-700">
                          {formatPercentage(item.masteryLevel)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>

          {/* Lesson activity */}
          <section>
            <SectionHeading
              eyebrow="Learning history"
              title="Your lesson activity"
              description="Lessons returned by your existing learner API."
            />

            <Card>
              {lessonsError ? (
                <p className="text-sm text-text-muted">
                  Lesson activity could not be loaded.
                </p>
              ) : completions.length === 0 ? (
                <div className="rounded-xl bg-ivory p-5">
                  <p className="font-semibold text-text">
                    No lesson activity to show yet
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    Once lessons are available in your learner history, they
                    will appear in this section.
                  </p>
                  <Link
                    href="/learner/learn"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Explore learning <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : (
                <ol className="space-y-0">
                  {completions.map((lesson, index) => (
                    <li
                      key={`${lesson.topicId}-${lesson.completedAt}`}
                      className="relative flex gap-4 pb-5 last:pb-0"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                          ✓
                        </div>
                        {index < completions.length - 1 && (
                          <div className="absolute top-9 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-border/70 p-4">
                        <p className="break-words text-sm font-semibold text-text">
                          {lesson.topicName}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Recorded: {formatDate(lesson.completedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </section>

          {/* Recommendations */}
          <section>
            <SectionHeading
              eyebrow="Personalized guidance"
              title="Recommended next steps"
              description="Recommendations supplied by your existing progress API."
            />

            <Card>
              {recommendationsError ? (
                <p className="text-sm leading-6 text-text-muted">
                  Recommendations are currently unavailable. You can still
                  continue with a practice assessment.
                </p>
              ) : recommendations.length === 0 ? (
                <div className="rounded-xl bg-ivory p-5">
                  <p className="font-semibold text-text">
                    No recommendations available yet
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    Your next steps will appear when the recommendation service
                    returns results.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recommendations.map((item, index) => (
                    <li
                      key={`${item.topicId}-${item.title}`}
                      className="group flex flex-col gap-4 rounded-2xl border border-border/70 p-4 transition hover:border-primary/30 hover:bg-ivory/50 sm:flex-row sm:items-center"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ivory text-xl">
                        <span aria-hidden="true">
                          {item.kind === "review"
                            ? "🔁"
                            : item.kind === "practice"
                              ? "⚡"
                              : "📖"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-text-muted">
                          {item.description}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
                      >
                        Start <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}

      {/* Honest status for features not backed by the current API */}
      <section className="rounded-2xl border border-border/70 bg-white/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-xl">
            <span aria-hidden="true">🏅</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-text">Achievements and study streaks</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Your current progress API provides topic mastery, lesson records,
              and recommendations. Verified badges, daily streaks, study-time
              charts, and notifications need their own reliable activity data
              before they can be displayed accurately.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
