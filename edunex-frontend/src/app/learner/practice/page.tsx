"use client";

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

export default function PracticePage() {
  const { learner } = useLearner();
  const { showToast } = useToast();

  const [realTopics, setRealTopics] = useState<Topic[] | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [realAssessment, setRealAssessment] = useState<Assessment | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
    setAnswers({});
    setResult(null);
    setValidationError(null);
  };

  const topicOptions = [
    ...(realTopics ?? []).map((t) => ({ id: t.id, label: t.name, isDemo: false })),
    ...demoAssessments
      .filter((a) => !(realTopics ?? []).some((t) => t.id === a.topicId))
      .map((a) => ({ id: a.topicId, label: `${a.topicName} (demo)`, isDemo: true })),
  ];

  return (
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
    </div>
  );
}
