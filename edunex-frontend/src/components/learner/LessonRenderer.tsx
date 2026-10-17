"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BookMarked, CheckCircle2, Layers, ListChecks, Quote, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { lessonSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Lesson, LessonBlock } from "@/types/lesson";
import { LinkedListVisualization } from "./LinkedListVisualization";

interface LessonRendererProps {
  lesson: Lesson;
}

export function LessonRenderer({ lesson }: LessonRendererProps) {
  const parsed = lessonSchema.safeParse(lesson);

  if (!parsed.success) {
    return (
      <ErrorState
        title="This lesson couldn't be displayed"
        description="The lesson payload didn't match the format EduNex knows how to render safely. No content was executed."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {parsed.data.blocks.map((block) => (
        <LessonBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockShell({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all">
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </div>
      {children}
    </section>
  );
}

function LessonBlockView({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "explanation":
      return (
        <BlockShell icon={BookMarked} label="Explanation">
          <h3 className="font-serif text-base font-medium text-text">{block.heading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{block.body}</p>
        </BlockShell>
      );

    case "key_concept":
      return (
        <section className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-secondary">
            <Layers className="size-3.5" aria-hidden="true" />
            Key concept
          </div>
          <p className="font-serif text-base font-medium text-text">{block.title}</p>
          <p className="mt-1 text-sm text-text-muted">{block.explanation}</p>
        </section>
      );

    case "step_by_step_example":
      return (
        <BlockShell icon={ListChecks} label="Step-by-step example">
          <h3 className="font-serif text-base font-medium text-text">{block.title}</h3>
          <ol className="mt-2 flex flex-col gap-1.5 text-sm text-text-muted">
            {block.steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ivory text-xs font-medium text-text">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </BlockShell>
      );

    case "diagram":
      return (
        <BlockShell icon={Workflow} label="Diagram">
          <div className="rounded-md border border-dashed border-border bg-ivory p-4">
            <div className="flex flex-wrap gap-2">
              {block.nodes.map((node) => (
                <span key={node.id} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text">
                  {node.label}
                </span>
              ))}
            </div>
            {block.edges.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-text-muted">
                {block.edges.map((edge, index) => {
                  const sourceLabel = block.nodes.find((n) => n.id === edge.source)?.label ?? edge.source;
                  const targetLabel = block.nodes.find((n) => n.id === edge.target)?.label ?? edge.target;
                  return (
                    <li key={index} className="flex items-center gap-1.5">
                      <span>{sourceLabel}</span>
                      <ArrowRight className="size-3" aria-hidden="true" />
                      <span>{targetLabel}</span>
                      {edge.label && <span className="italic">({edge.label})</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="mt-2 text-xs text-text-muted">{block.caption}</p>
        </BlockShell>
      );

    case "interactive_visualization":
      return (
        <BlockShell icon={Workflow} label="Interactive visualization">
          <h3 className="font-serif text-base font-medium text-text">{block.title}</h3>
          <div className="mt-3">
            {block.componentType === "linked_list" ? (
              <LinkedListVisualization initialValues={block.config.nodeValues} />
            ) : (
              <ErrorState
                title="Visualization not available"
                description={`EduNex doesn't yet support the "${block.componentType}" visualization type.`}
              />
            )}
          </div>
        </BlockShell>
      );

    case "practice_question":
      return <PracticeQuestionBlockView block={block} />;

    case "summary":
      return (
        <section className="rounded-lg border border-success/30 bg-success-bg p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Summary
          </div>
          <ul className="flex flex-col gap-1.5 text-sm text-text">
            {block.points.map((point, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "source_references":
      return (
        <BlockShell icon={Quote} label="Source references">
          <ul className="flex flex-col gap-2 text-sm text-text-muted">
            {block.sources.map((source) => (
              <li key={source.chunkId}>
                <p className="font-medium text-text">{source.documentTitle}</p>
                {source.excerpt && <p className="mt-0.5 text-xs">{source.excerpt}</p>}
              </li>
            ))}
          </ul>
        </BlockShell>
      );

    default:
      return null;
  }
}

function PracticeQuestionBlockView({
  block,
}: {
  block: Extract<LessonBlock, { type: "practice_question" }>;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <BlockShell icon={ListChecks} label="Practice question">
      <p className="font-serif text-base font-medium text-text">{block.prompt}</p>
      <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={block.prompt}>
        {block.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = index === block.correctOptionIndex;
          const showResult = selected !== null;
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(index)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                showResult && isCorrect && "border-success bg-success-bg text-success",
                showResult && isSelected && !isCorrect && "border-error bg-error-bg text-error",
                !showResult && "border-border bg-card text-text hover:bg-ivory hover:border-primary/40",
                showResult && !isSelected && !isCorrect && "border-border bg-card text-text opacity-60",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-3 text-sm text-text-muted" role="status">
          {block.explanation}
        </p>
      )}
    </BlockShell>
  );
}
