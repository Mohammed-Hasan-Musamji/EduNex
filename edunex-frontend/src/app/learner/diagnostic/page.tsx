"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DiagnosticResults } from "@/components/diagnostic/DiagnosticResults";
import { useGamification } from "@/components/gamification/GamificationProvider";
import { DifficultyBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProgressBar } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { diagnosticsApi, subjectsApi } from "@/lib/api-client";
import { buildDiagnosticUrl } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/content";
import type { DiagnosticState } from "@/types/engagement";

interface Feedback {
  isCorrect: boolean;
  explanation: string;
}

function DiagnosticFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { celebrate } = useGamification();
  const diagnosticId = params.get("id");

  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [state, setState] = useState<DiagnosticState | null>(null);
  const [next, setNext] = useState<DiagnosticState | null>(null);
  const [selected, setSelected] = useState<number | boolean | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    setError(null);
    const res = await diagnosticsApi.get(id);
    if (res.ok) setState(res.data);
    else setError(res.error.message);
  }, []);

  useEffect(() => {
    if (diagnosticId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load(diagnosticId);
    } else {
      void subjectsApi.list().then((res) => setSubjects(res.ok ? res.data : []));
    }
  }, [diagnosticId, load]);

  const start = async (subjectId: string) => {
    setBusy(true);
    setError(null);
    const res = await diagnosticsApi.start(subjectId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.replace(buildDiagnosticUrl(res.data.id));
  };

  const submit = async () => {
    if (!state?.question || selected === null) return;
    setBusy(true);
    const res = await diagnosticsApi.answer(state.id, { questionId: state.question.id, submittedAnswer: selected });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setFeedback({ isCorrect: res.data.attempt.isCorrect, explanation: res.data.attempt.explanation });
    setNext(res.data.state);
    if (res.data.state.status === "completed") {
      celebrate(res.data.rewards, { title: "Diagnostic complete", message: "Your starting point and next step are ready." });
    }
  };

  const advance = () => {
    setState(next);
    setNext(null);
    setFeedback(null);
    setSelected(null);
  };

  if (!diagnosticId) {
    return (
      <div>
        <PageHeader
          eyebrow="Skills diagnostic"
          title="Find your starting point"
          description="A short adaptive check: each answer is graded on the server, and the next question gets harder or easier depending on how you did. It shapes your recommendations, not a grade."
        />
        {error && <ErrorState className="mb-4" title="Couldn't start the diagnostic" description={error} />}
        {subjects === null ? (
          <Skeleton className="h-40" />
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Once subjects are added, you can take a diagnostic here." />
        ) : (
          <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s, i) => (
              <li key={s.id} style={{ "--i": i } as React.CSSProperties}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void start(s.id)}
                  className="group flex h-full w-full flex-col items-start gap-1 rounded-[var(--radius-lg)] border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60"
                >
                  <span className="font-serif text-base font-semibold text-text">{s.name}</span>
                  <span className="text-sm text-text-muted">{s.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Start <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (error && !state) return <ErrorState title="Couldn't load the diagnostic" description={error} onRetry={() => void load(diagnosticId)} />;
  if (!state) return <Skeleton className="h-72" />;

  if (state.status === "completed" && state.summary) {
    return (
      <div>
        <PageHeader eyebrow="Skills diagnostic" title="Your results" description="Based only on the answers you gave in this diagnostic." />
        <DiagnosticResults summary={state.summary} />
      </div>
    );
  }

  const q = state.question;
  const answeredNow = state.answeredCount + (feedback ? 1 : 0);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={`${state.subjectName} diagnostic`} title={`Question ${Math.min(state.answeredCount + 1, state.maxQuestions)} of ${state.maxQuestions}`} />
      <ProgressBar value={answeredNow} max={state.maxQuestions} tone="accent" size="md" label="Diagnostic progress" />
      {q ? (
        <section key={q.id} className="mt-6 animate-enter rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-subtle">
            {state.questionTopicName && <span>{state.questionTopicName}</span>}
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          <p className="mt-3 font-serif text-lg font-medium text-text">{q.prompt}</p>
          <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label={q.prompt}>
            {(q.type === "multiple_choice" ? (q.options ?? []).map((o, i) => [i, o] as const) : ([[true, "True"], [false, "False"]] as const)).map(
              ([value, label]) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={selected === value}
                  disabled={Boolean(feedback)}
                  onClick={() => setSelected(value)}
                  className={cn(
                    "min-h-12 rounded-[var(--radius-md)] border px-4 py-2.5 text-left text-sm transition-colors",
                    selected === value ? "border-primary bg-primary-soft text-text" : "border-border bg-card hover:bg-ivory",
                    feedback && "cursor-default",
                  )}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {feedback && (
            <div
              role="status"
              className={cn(
                "mt-4 flex animate-enter items-start gap-2 rounded-md p-3 text-sm",
                feedback.isCorrect ? "bg-success-bg text-success" : "bg-error-bg text-error",
              )}
            >
              {feedback.isCorrect ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>
                <span className="font-semibold">{feedback.isCorrect ? "Correct." : "Not quite."}</span>{" "}
                <span className="text-text">{feedback.explanation}</span>
              </span>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            {feedback ? (
              <Button onClick={advance}>
                {next?.status === "completed" ? "See results" : "Next question"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={() => void submit()} isLoading={busy} disabled={selected === null}>
                Check answer
              </Button>
            )}
          </div>
        </section>
      ) : (
        <ErrorState className="mt-6" description="This diagnostic has no current question. Reload to continue." onRetry={() => void load(state.id)} />
      )}
    </div>
  );
}

export default function DiagnosticPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72" />}>
      <DiagnosticFlow />
    </Suspense>
  );
}
