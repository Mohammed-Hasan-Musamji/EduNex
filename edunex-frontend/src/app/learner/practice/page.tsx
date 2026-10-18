"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Dumbbell,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AssessmentQuestion } from "@/components/learner/AssessmentQuestion";
import { demoAssessments, scoreDemoAssessment } from "@/lib/demo-data";
import { assessmentsApi } from "@/lib/api-client";
import { listAllRealTopics } from "@/lib/real-topics";
import { formatPercentage } from "@/lib/formatters";
import { appConfig } from "@/config/app";
import { routes } from "@/lib/routes";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { playClickSound, playHoverTick, playSuccessChime } from "@/lib/audio-effects";
import type { AssessmentResult, QuestionAnswer, Assessment } from "@/types/assessment";
import type { Topic } from "@/types/content";
import { cn } from "@/lib/utils";
=======
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssessmentQuestion } from "@/components/learner/AssessmentQuestion";
import { useGamification } from "@/components/gamification/GamificationProvider";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProgressRing } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { assessmentsApi, subjectsApi } from "@/lib/api-client";
import { buildLearnUrl, routes } from "@/lib/routes";
import type { AssessmentQuestion as Question, QuestionAnswer } from "@/types/assessment";
import type { Subject } from "@/types/content";
import type { PracticeRoundResult } from "@/types/engagement";
>>>>>>> b5abe61 (Implemented 3)

const ROUND_SIZE = 5;

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function PracticeRound() {
  const params = useSearchParams();
  const { celebrate } = useGamification();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [result, setResult] = useState<PracticeRoundResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef<string | null>(null);

  useEffect(() => {
<<<<<<< HEAD
    void listAllRealTopics().then((topics) => {
      setRealTopics(topics);
      if (topics[0]) setSelectedTopicId(topics[0].id);
      else if (demoAssessments[0]) setSelectedTopicId(demoAssessments[0].topicId);
    });
  }, []);

  const selectedRealTopic = realTopics?.find((t) => t.id === selectedTopicId) ?? null;
  const selectedDemoAssessment = demoAssessments.find((a) => a.topicId === selectedTopicId) ?? null;

  useEffect(() => {
    if (!selectedRealTopic) {
      setRealAssessment(null);
      return;
    }
    setIsLoadingQuestions(true);
    void assessmentsApi.listQuestions(selectedRealTopic.id).then((res) => {
      setIsLoadingQuestions(false);
      if (res.ok) {
        setRealAssessment({
          id: `real-${selectedRealTopic.id}`,
          topicId: selectedRealTopic.id,
          topicName: selectedRealTopic.name,
          isDemo: false,
          questions: res.data,
        });
      }
    });
  }, [selectedRealTopic]);

  const assessment = realAssessment ?? selectedDemoAssessment ?? null;

  const resultsByQuestion = useMemo(() => {
    const map = new Map<string, AssessmentResult["questionResults"][number]>();
    result?.questionResults.forEach((r) => map.set(r.questionId, r));
    return map;
  }, [result]);

  const selectTopic = (id: string) => {
    playClickSound();
    setSelectedTopicId(id);
    setAnswers({});
    setResult(null);
    setValidationError(null);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assessment?.questions.length ?? 0;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSubmit = async () => {
    if (!assessment || isSubmitting) return;
    const missing = assessment.questions.some((q) => {
      const answer = answers[q.id];
      if (q.type === "multiple_choice") return answer?.selectedOptionIndex === undefined;
      if (q.type === "true_false") return answer?.selectedBoolean === undefined;
      return !answer?.textAnswer?.trim();
    });
    if (missing) {
      setValidationError("Please answer every question before submitting.");
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    playClickSound();

    if (!assessment.isDemo && learner) {
      const attempts = [];
      for (const q of assessment.questions) {
        const answer = answers[q.id];
        const submittedAnswer = q.type === "multiple_choice" ? answer.selectedOptionIndex! : answer.selectedBoolean!;
        attempts.push(await assessmentsApi.submitAttempt({ learnerId: learner.id, questionId: q.id, submittedAnswer }));
      }
      const failed = attempts.find((a) => !a.ok);
      if (failed && !failed.ok) {
        showToast({ variant: "error", title: "Couldn't submit answers", description: failed.error.message });
        setIsSubmitting(false);
        return;
      }
      const questionResults = attempts.map((a, i) =>
        a.ok
          ? { questionId: assessment.questions[i].id, correct: a.data.isCorrect, explanation: a.data.explanation }
          : { questionId: assessment.questions[i].id, correct: false, explanation: "" },
      );
      const score = Math.round(
        (questionResults.filter((r) => r.correct).length / questionResults.length) * 100,
      );
      setResult({ assessmentId: assessment.id, topicId: assessment.topicId, score, completedAt: new Date().toISOString(), questionResults });
      showToast({ variant: "success", title: "Progress updated", description: "Your latest assessment results have been recorded." });
      playSuccessChime();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const scored = scoreDemoAssessment(assessment, Object.values(answers));
      setResult(scored);
      playSuccessChime();
    }
    setIsSubmitting(false);
  };

  const handleRetry = () => {
    playClickSound();
=======
    void Promise.all([subjectsApi.list()]).then(async ([list]) => {
      if (!list.ok) {
        setLoadError(list.error.message);
        setSubjects([]);
        return;
      }
      const detailed = await Promise.all(list.data.map((s) => subjectsApi.getWithTopics(s.id)));
      const full = detailed.flatMap((r) => (r.ok ? [r.data] : []));
      setSubjects(full);
      const wanted = params.get("topic");
      const all = full.flatMap((s) => s.topics);
      setTopicId(all.find((t) => t.id === wanted)?.id ?? all[0]?.id ?? "");
    });
  }, [params]);

  const loadQuestions = (id: string) => {
    setQuestions(null);
>>>>>>> b5abe61 (Implemented 3)
    setAnswers({});
    setResult(null);
    setSubmitError(null);
    requestId.current = null;
    void assessmentsApi.listQuestions(id, ROUND_SIZE).then((res) => {
      if (res.ok) setQuestions(res.data);
      else {
        setLoadError(res.error.message);
        setQuestions([]);
      }
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (topicId) loadQuestions(topicId);
  }, [topicId]);

  const topicName = useMemo(
    () => subjects?.flatMap((s) => s.topics).find((t) => t.id === topicId)?.name ?? "",
    [subjects, topicId],
  );
  const resultsById = useMemo(() => new Map(result?.results.map((r) => [r.questionId, r]) ?? []), [result]);
  const answeredCount = questions?.filter((q) => {
    const a = answers[q.id];
    return q.type === "multiple_choice" ? a?.selectedOptionIndex !== undefined : a?.selectedBoolean !== undefined;
  }).length ?? 0;

  const submit = async () => {
    if (!questions || submitting) return;
    if (answeredCount < questions.length) {
      setSubmitError("Answer every question before submitting.");
      return;
    }
    // Same id for retries of this exact submission, so a network retry can't record the round twice.
    requestId.current ??= newRequestId();
    setSubmitting(true);
    setSubmitError(null);
    const res = await assessmentsApi.submitRound({
      topicId,
      clientRequestId: requestId.current,
      answers: questions.map((q) => ({
        questionId: q.id,
        submittedAnswer: q.type === "multiple_choice" ? answers[q.id].selectedOptionIndex! : answers[q.id].selectedBoolean!,
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error.message);
      return;
    }
    setResult(res.data);
    const improved = res.data.previousScore !== null && res.data.score > res.data.previousScore;
    celebrate(res.data.rewards, {
      title: improved ? "You improved!" : "Round recorded",
      message: improved
        ? `${Math.round(res.data.previousScore!)}% → ${Math.round(res.data.score)}% on ${res.data.topicName}.`
        : `${res.data.correct}/${res.data.total} correct on ${res.data.topicName}.`,
    });
  };

  if (subjects === null) return <Skeleton className="h-72" />;
  const topics = subjects.flatMap((s) => s.topics);
  if (topics.length === 0) {
    return <EmptyState title="No topics to practice yet" description={loadError ?? "Topics appear once subjects have content."} />;
  }

  return (
<<<<<<< HEAD
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs backdrop-blur-xl transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Dumbbell className="size-5" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Practice & Assessments
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Check your recall, test concept comprehension, and get immediate guided feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-ivory px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs">
            <CheckCircle2 className="size-3.5 text-success" />
            {assessment?.questions.length ?? 0} Diagnostic Items
          </span>
        </div>
      </div>

      {/* Topic Selector & Quiz Progress Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <div className="w-full sm:max-w-xs">
          <Select
            label="Active Topic"
            value={selectedTopicId}
            onChange={(event) => selectTopic(event.target.value)}
          >
            {topicOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {totalQuestions > 0 && (
          <div className="flex-1 sm:max-w-xs space-y-1.5 sm:text-right">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-semibold">
              <span className="text-text-muted">Questions Answered:</span>
              <span className="text-primary font-bold">
                {answeredCount} / {totalQuestions} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Score Summary Celebration Card when submitted */}
      {result && (
        <div className="rounded-3xl border border-primary/40 bg-card p-6 sm:p-8 shadow-xl shadow-primary/10 backdrop-blur-xl animate-fade-scale">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/30">
                <Trophy className="size-8 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Assessment Completed</span>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-text">
                  Score: {formatPercentage(result.score)}
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                  You answered {result.questionResults.filter((r) => r.correct).length} of{" "}
                  {result.questionResults.length} questions correctly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                onMouseEnter={playHoverTick}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text shadow-2xs hover:bg-ivory hover:border-primary/40 transition-all"
              >
                <RotateCcw className="size-4" />
                <span>Retry Quiz</span>
              </button>

              <Link
                href={routes.learner.subjects}
                onMouseEnter={playHoverTick}
                onClick={playClickSound}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 hover:bg-primary-hover transition-all"
              >
                <span>Next Subject</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Questions List or Shimmer Loading Skeleton */}
      {isLoadingQuestions ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl skeleton-shimmer" />
                <div className="h-5 w-72 rounded-md skeleton-shimmer" />
              </div>
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-11 rounded-xl skeleton-shimmer w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : assessment && assessment.questions.length > 0 ? (
        <div className="space-y-5">
          {assessment.isDemo && (
            <p className="rounded-2xl border border-border/80 bg-ivory/60 px-4 py-2.5 text-xs font-medium text-text-muted">
              ℹ️ {appConfig.demoDataLabel} — this topic is in preview mode; scoring evaluates in your session.
            </p>
          )}

          {assessment.questions.map((question, index) => (
            <AssessmentQuestion
              key={question.id}
              question={question}
              index={index}
              selectedOptionIndex={answers[question.id]?.selectedOptionIndex}
              selectedBoolean={answers[question.id]?.selectedBoolean}
              textAnswer={answers[question.id]?.textAnswer}
              result={resultsByQuestion.get(question.id)}
              onSelectOption={(optionIndex) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: { questionId: question.id, selectedOptionIndex: optionIndex },
                }))
              }
              onSelectBoolean={(value) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: { questionId: question.id, selectedBoolean: value },
                }))
              }
              onChangeText={(value) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: { questionId: question.id, textAnswer: value },
                }))
              }
            />
          ))}

          {validationError && (
            <p className="text-xs sm:text-sm font-semibold text-error animate-shake" role="alert">
              ⚠️ {validationError}
            </p>
          )}

          {!result && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                onMouseEnter={playHoverTick}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-hover px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 active:scale-95"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  aria-hidden="true"
                />
                <Sparkles className="size-4" />
                <span>{isSubmitting ? "Evaluating Answers…" : "Submit Assessment"}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      ) : assessment ? (
        <SpotlightCard className="p-8 text-center">
          <p className="text-sm text-text-muted">No practice questions are available for this topic yet.</p>
        </SpotlightCard>
      ) : null}

      {/* Info Card */}
      <SpotlightCard className="p-6">
        <h3 className="font-serif text-lg font-bold tracking-tight text-text">About Assessment & Adaptive Feedback</h3>
        <p className="mt-2 text-xs sm:text-sm text-text-muted leading-relaxed">
          Multiple-choice and true/false questions for backend-seeded topics (such as Linked Lists) are graded
          on the server — your browser never decides whether an answer is correct. Answers update your demonstrated
          mastery and guide future lesson adaptation.
        </p>
      </SpotlightCard>
=======
    <div className="flex flex-col gap-5">
      <div className="max-w-sm">
        <Select label="Topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          {subjects.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {s.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      {result && (
        <section className="flex animate-enter flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
          <ProgressRing value={result.score} tone={result.score >= 80 ? "success" : "accent"} size={96} label="Round score">
            <span className="text-xl font-semibold text-text">{Math.round(result.score)}%</span>
          </ProgressRing>
          <div className="flex-1">
            <p className="font-serif text-lg font-semibold text-text">
              {result.correct}/{result.total} correct on {result.topicName}
            </p>
            {result.previousScore !== null && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-muted">
                {result.score >= result.previousScore ? (
                  <TrendingUp className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-4 text-text-subtle" aria-hidden="true" />
                )}
                Previous round: {Math.round(result.previousScore)}%
              </p>
            )}
            <p className="mt-1 text-sm text-text-muted">
              {result.score < 60
                ? "This topic needs another look. A lesson will help before the next round."
                : result.score < 100
                  ? "Solid progress. Review the explanations below, then try another round."
                  : "Every answer correct. Try a harder topic next."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => loadQuestions(topicId)}>
              <RotateCcw className="size-4" aria-hidden="true" /> New round
            </Button>
            {result.score < 60 && (
              <Link href={buildLearnUrl({ topicId })} className={buttonClasses("primary")}>
                Learn {topicName} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      )}

      {questions === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          title={`No questions for ${topicName} yet`}
          description="Questions for textbook topics are generated from the indexed chapters and appear here once available."
          action={
            <Link href={routes.learner.tutor} className={buttonClasses("secondary")}>
              Ask the textbook instead
            </Link>
          }
        />
      ) : (
        <>
          <div className="stagger flex flex-col gap-3">
            {questions.map((q, index) => {
              const r = resultsById.get(q.id);
              return (
                <div key={q.id} style={{ "--i": index } as React.CSSProperties}>
                  <AssessmentQuestion
                    question={q}
                    index={index}
                    selectedOptionIndex={answers[q.id]?.selectedOptionIndex}
                    selectedBoolean={answers[q.id]?.selectedBoolean}
                    result={r ? { questionId: q.id, correct: r.isCorrect, explanation: r.explanation } : undefined}
                    onSelectOption={(i) => {
                      requestId.current = null;
                      setAnswers((a) => ({ ...a, [q.id]: { questionId: q.id, selectedOptionIndex: i } }));
                    }}
                    onSelectBoolean={(v) => {
                      requestId.current = null;
                      setAnswers((a) => ({ ...a, [q.id]: { questionId: q.id, selectedBoolean: v } }));
                    }}
                  />
                </div>
              );
            })}
          </div>
          {!result && (
            <div className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-card/95 p-3 shadow-md backdrop-blur lg:bottom-4">
              <span className="text-sm text-text-muted">
                {answeredCount}/{questions.length} answered · graded on the server
              </span>
              <Button onClick={() => void submit()} isLoading={submitting}>
                Submit answers
              </Button>
            </div>
          )}
          {submitError && <ErrorState title="Couldn't submit" description={submitError} onRetry={() => void submit()} />}
        </>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Practice & Assessments"
        description="Short rounds of up to five questions, preferring ones you haven't answered yet. Your browser never decides whether an answer is right: every answer is graded on the server."
      />
      <Suspense fallback={<Skeleton className="h-72" />}>
        <PracticeRound />
      </Suspense>
>>>>>>> b5abe61 (Implemented 3)
    </div>
  );
}
