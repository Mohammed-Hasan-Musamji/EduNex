"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TutorAnswerCard } from "@/components/tutor/TutorAnswerCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { catalogApi, subjectsApi, tutorApi } from "@/lib/api-client";
import type { Subject } from "@/types/content";
import type { SubjectDocument, TutorAnswer } from "@/types/engagement";

const MAX_QUESTION = 1000;

interface Exchange {
  id: string;
  question: string;
  answer: TutorAnswer;
}

export default function TutorPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [documents, setDocuments] = useState<SubjectDocument[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);

  useEffect(() => {
    void subjectsApi.list().then((res) => setSubjects(res.ok ? res.data : []));
  }, []);

  useEffect(() => {
    if (!subjectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocuments([]);
      return;
    }
    void catalogApi.documents(subjectId).then((res) => setDocuments(res.ok ? res.data : []));
  }, [subjectId]);

  const ask = async () => {
    const trimmed = question.trim();
    if (trimmed.length < 3 || isAsking) {
      setError(trimmed.length < 3 ? "Ask a question of at least a few words." : null);
      return;
    }
    setIsAsking(true);
    setError(null);
    const res = await tutorApi.ask({ question: trimmed, subjectId, documentId });
    setIsAsking(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setHistory((h) => [{ id: res.data.interactionId, question: trimmed, answer: res.data }, ...h]);
    setQuestion("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Textbook tutor"
        title="Ask the Textbook"
        description="Answers use indexed course textbooks when relevant passages are available, with citations to the source and PDF page. If no passage supports your question, Gemini can still help with a general answer that is clearly marked as unverified."
      />

      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects === null ? (
              <Skeleton className="h-16" />
            ) : (
              <Select
                label="Subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setDocumentId("");
                }}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
            <Select
              label="Chapter"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              disabled={!subjectId || documents.length === 0}
            >
              <option value="">{subjectId && documents.length === 0 ? "No indexed chapters yet" : "All chapters"}</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
            rows={3}
            maxLength={MAX_QUESTION}
            placeholder="e.g. What does the head pointer of a linked list reference?"
            error={error ?? undefined}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-text-subtle">
              {question.length}/{MAX_QUESTION} · Enter to ask, Shift+Enter for a new line
            </span>
            <Button type="submit" isLoading={isAsking}>
              <Send className="size-4" aria-hidden="true" />
              Ask
            </Button>
          </div>
        </form>
      </section>

      <div className="mt-6 flex flex-col gap-4" aria-live="polite">
        {isAsking && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
            <p className="text-sm text-text-muted">Searching the textbooks and asking Gemini…</p>
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
              <Skeleton className="h-4 w-10/12" />
            </div>
          </div>
        )}
        {error && history.length === 0 && !isAsking && (
          <ErrorState title="Couldn't answer that" description={error} onRetry={() => void ask()} />
        )}
        {history.length === 0 && !isAsking && !error && (
          <EmptyState
            icon={BookOpenText}
            title="Ask anything from your course textbooks"
            description="Ask about your course material or another topic. Pick a subject or chapter to narrow textbook search."
          />
        )}
        {history.map((exchange) => (
          <TutorAnswerCard key={exchange.id} question={exchange.question} answer={exchange.answer} />
        ))}
      </div>
    </div>
  );
}
