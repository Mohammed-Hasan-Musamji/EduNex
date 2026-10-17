"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { AssessmentQuestion } from "@/components/learner/AssessmentQuestion";
import { demoAssessments, scoreDemoAssessment } from "@/lib/demo-data";
import { assessmentsApi } from "@/lib/api-client";
import { listAllRealTopics } from "@/lib/real-topics";
import { formatPercentage } from "@/lib/formatters";
import { appConfig } from "@/config/app";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import type { AssessmentResult, QuestionAnswer, Assessment } from "@/types/assessment";
import type { Topic } from "@/types/content";

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
    // Re-derives question state whenever the selected topic changes --
    // intentionally sets state directly in response to that change.
    if (!selectedRealTopic) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setSelectedTopicId(id);
    setAnswers({});
    setResult(null);
    setValidationError(null);
  };

  const handleSubmit = async () => {
    if (!assessment || isSubmitting) return;
    const missing = assessment.questions.some((q) => {
      const answer = answers[q.id];
      if (q.type === "multiple_choice") return answer?.selectedOptionIndex === undefined;
      if (q.type === "true_false") return answer?.selectedBoolean === undefined;
      return !answer?.textAnswer?.trim();
    });
    if (missing) {
      setValidationError("Answer every question before submitting.");
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);

    if (!assessment.isDemo && learner) {
      // Submitted one at a time (not in parallel) -- each attempt updates
      // the same learner+topic progress row, and sequential submission
      // avoids relying on the backend to resolve concurrent writes to it.
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
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setResult(scoreDemoAssessment(assessment, Object.values(answers)));
    }
    setIsSubmitting(false);
  };

  const handleRetry = () => {
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
    <div>
      <PageHeader
        title="Practice & Assessments"
        description="Check your understanding and get targeted feedback on each answer."
      />

      <div className="max-w-xs">
        <Select label="Topic" value={selectedTopicId} onChange={(event) => selectTopic(event.target.value)}>
          {topicOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoadingQuestions ? (
        <LoadingState label="Loading questions…" className="mt-6" />
      ) : assessment && assessment.questions.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {assessment.isDemo && (
            <p className="rounded-md bg-ivory px-3 py-2 text-xs font-medium text-text-muted">
              {appConfig.demoDataLabel} — this topic has no backend-seeded questions yet; scoring happens locally.
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
                setAnswers((current) => ({ ...current, [question.id]: { questionId: question.id, selectedOptionIndex: optionIndex } }))
              }
              onSelectBoolean={(value) =>
                setAnswers((current) => ({ ...current, [question.id]: { questionId: question.id, selectedBoolean: value } }))
              }
              onChangeText={(value) =>
                setAnswers((current) => ({ ...current, [question.id]: { questionId: question.id, textAnswer: value } }))
              }
            />
          ))}

          {validationError && (
            <p className="text-sm text-error" role="alert">
              {validationError}
            </p>
          )}

          <div className="flex items-center gap-3">
            {!result ? (
              <Button onClick={handleSubmit} isLoading={isSubmitting}>
                Submit answers
              </Button>
            ) : (
              <>
                <span className="font-medium text-text">
                  Score: {formatPercentage(result.score)} ({result.questionResults.filter((r) => r.correct).length}/
                  {result.questionResults.length} correct)
                </span>
                <Button variant="secondary" onClick={handleRetry}>
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      ) : assessment ? (
        <Card className="mt-6">
          <p className="text-sm text-text-muted">No practice questions are available for this topic yet.</p>
        </Card>
      ) : null}

      <Card className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>About scoring</CardTitle>
        </div>
        <p className="text-sm text-text-muted">
          Multiple-choice and true/false questions for backend-seeded topics (currently Linked Lists) are graded on
          the server — your browser never decides whether an answer is correct. Demo topics are scored locally and
          clearly labeled.
        </p>
      </Card>
    </div>
  );
}
