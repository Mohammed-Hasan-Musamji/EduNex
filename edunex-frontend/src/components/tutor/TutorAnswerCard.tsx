"use client";

import { useId } from "react";
import { BookOpenCheck, CircleHelp, FileText, ShieldCheck, ShieldQuestion } from "lucide-react";
import { ListenControls } from "@/components/audio/ListenControls";
import { Badge } from "@/components/ui/Badge";
import type { TutorAnswer, TutorSource } from "@/types/engagement";

function pageLabel(source: TutorSource): string | null {
  if (source.pageStart === null) return null;
  return source.pageEnd !== null && source.pageEnd !== source.pageStart
    ? `PDF pp. ${source.pageStart}–${source.pageEnd}`
    : `PDF p. ${source.pageStart}`;
}

/** Renders "[n]" markers as links to the matching source card. */
function AnswerText({ text, anchorPrefix }: { text: string; anchorPrefix: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;
        return (
          <a
            key={i}
            href={`#${anchorPrefix}-${match[1]}`}
            className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded bg-accent-soft px-1 align-super text-[11px] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
            aria-label={`Source ${match[1]}`}
          >
            {match[1]}
          </a>
        );
      })}
    </p>
  );
}

export function TutorAnswerCard({ question, answer }: { question: string; answer: TutorAnswer }) {
  const anchorPrefix = useId().replace(/:/g, "");
  const status = !answer.grounded
    ? { tone: "warning" as const, icon: ShieldQuestion, label: "Not found in the textbooks" }
    : answer.support === "partial"
      ? { tone: "gold" as const, icon: CircleHelp, label: "Partly covered by the textbooks" }
      : { tone: "success" as const, icon: ShieldCheck, label: "Answered from the textbooks" };
  const StatusIcon = status.icon;

  return (
    <article className="animate-enter rounded-[var(--radius-lg)] border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-3">
        <p className="text-xs font-medium text-text-subtle">You asked</p>
        <p className="mt-0.5 font-medium text-text">{question}</p>
      </header>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>
            <StatusIcon className="size-3.5" aria-hidden="true" /> {status.label}
          </Badge>
          {answer.grounded && (
            <span className="text-xs text-text-subtle">
              {answer.sources.length} cited passage{answer.sources.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <AnswerText text={answer.answer} anchorPrefix={anchorPrefix} />

        {answer.grounded && <ListenControls text={answer.answer} label="Listen" showTranscript />}

        <p className="text-xs text-text-subtle">{answer.personalization.explanation}</p>

        {answer.sources.length > 0 && (
          <section aria-label="Sources">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
              <BookOpenCheck className="size-4 text-accent" aria-hidden="true" /> Sources
            </h3>
            <ol className="flex flex-col gap-2">
              {answer.sources.map((source) => (
                <li
                  key={source.chunkId}
                  id={`${anchorPrefix}-${source.ref}`}
                  className="scroll-mt-24 rounded-[var(--radius-md)] border border-border bg-ivory/70 p-3 target:border-accent target:ring-2 target:ring-accent/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="flex items-start gap-2 text-sm font-medium text-text">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-accent text-[11px] font-semibold text-white">
                        {source.ref}
                      </span>
                      <span>
                        {source.chapter ?? source.title}
                        {source.section && <span className="font-normal text-text-muted"> · {source.section}</span>}
                      </span>
                    </p>
                    <span className="text-xs text-text-subtle">
                      {[source.subject, pageLabel(source)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <details className="mt-2 text-sm text-text-muted">
                    <summary className="cursor-pointer text-xs font-medium text-primary">Show passage</summary>
                    <p className="mt-2 border-l-2 border-border-strong pl-3 leading-relaxed">{source.excerpt}…</p>
                    {source.sourceFile && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-text-subtle">
                        <FileText className="size-3" aria-hidden="true" /> {source.sourceFile}
                      </p>
                    )}
                  </details>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}
