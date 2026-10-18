<<<<<<< HEAD
"use client";

import { Check, CheckCircle2, HelpCircle, Lightbulb, X, XCircle } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Input } from "@/components/ui/Input";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
=======
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/Badge";
>>>>>>> b5abe61 (Implemented 3)
import { cn } from "@/lib/utils";
import type { AssessmentQuestion as AssessmentQuestionType, QuestionResult } from "@/types/assessment";

interface AssessmentQuestionProps {
  question: AssessmentQuestionType;
  index: number;
  selectedOptionIndex?: number;
  selectedBoolean?: boolean;
  result?: QuestionResult;
  onSelectOption: (index: number) => void;
  onSelectBoolean: (value: boolean) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function AssessmentQuestion({
  question,
  index,
  selectedOptionIndex,
  selectedBoolean,
  result,
  onSelectOption,
  onSelectBoolean,
}: AssessmentQuestionProps) {
  const isSubmitted = Boolean(result);
  const isAnswered =
    selectedOptionIndex !== undefined || selectedBoolean !== undefined || Boolean(textAnswer?.trim());

  return (
<<<<<<< HEAD
    <SpotlightCard
      className={cn(
        "p-6 sm:p-7 transition-all duration-300",
        isSubmitted && result?.correct && "border-success/40 ring-1 ring-success/20 bg-success/5",
        isSubmitted && !result?.correct && "border-error/40 ring-1 ring-error/20 bg-error/5"
      )}
    >
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shadow-xs ring-1 ring-primary/20">
            Q{index + 1}
          </span>
          <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-text leading-snug">
            {question.prompt}
          </h3>
        </div>

        {isSubmitted && (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs animate-badge-pop shrink-0",
              result?.correct
                ? "bg-success/15 text-success border border-success/30"
                : "bg-error/15 text-error border border-error/30"
            )}
          >
            {result?.correct ? (
              <>
                <CheckCircle2 className="size-4" /> Correct
              </>
            ) : (
              <>
                <XCircle className="size-4" /> Needs Review
              </>
            )}
          </span>
        )}
=======
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-text-subtle">
            {question.difficulty && <DifficultyBadge difficulty={question.difficulty} />}
            {question.origin === "generated" && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" aria-hidden="true" />
                AI-written from {question.sourceTitle ?? "the textbook"}
                {question.sourcePage ? `, PDF p. ${question.sourcePage}` : ""}
              </span>
            )}
          </div>
          <p className="font-medium text-text">
            {index + 1}. {question.prompt}
          </p>
        </div>
        {isSubmitted &&
          (result!.correct ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Correct" />
          ) : (
            <XCircle className="size-5 shrink-0 text-error" aria-label="Incorrect" />
          ))}
>>>>>>> b5abe61 (Implemented 3)
      </div>

      {/* Multiple Choice Options */}
      {question.type === "multiple_choice" ? (
<<<<<<< HEAD
        <div className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label={question.prompt}>
          {question.options?.map((option, optionIndex) => {
            const isSelected = selectedOptionIndex === optionIndex;
            const letter = OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1);

            return (
              <button
                key={optionIndex}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSubmitted}
                onMouseEnter={!isSubmitted ? playHoverTick : undefined}
                onClick={() => {
                  if (!isSubmitted) {
                    playClickSound();
                    onSelectOption(optionIndex);
                  }
                }}
                className={cn(
                  "group/opt flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 text-left text-sm font-medium transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/40 shadow-xs scale-[1.008]"
                    : "border-border/80 bg-card text-text hover:border-primary/50 hover:bg-ivory hover:translate-x-1",
                  isSubmitted && "cursor-default opacity-90 hover:translate-x-0"
                )}
              >
                {/* Letter Pill Badge */}
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-200",
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-ivory text-text-muted border border-border group-hover/opt:border-primary/40 group-hover/opt:text-primary"
                  )}
                >
                  {letter}
                </span>

                <span className="flex-1 leading-relaxed">{option}</span>

                {isSelected && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-2xs animate-badge-pop">
                    <Check className="size-3 stroke-[2.5]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : question.type === "true_false" ? (
        <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label={question.prompt}>
          {[true, false].map((value) => {
            const isSelected = selectedBoolean === value;
            const Icon = value ? Check : X;

            return (
              <button
                key={String(value)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSubmitted}
                onMouseEnter={!isSubmitted ? playHoverTick : undefined}
                onClick={() => {
                  if (!isSubmitted) {
                    playClickSound();
                    onSelectBoolean(value);
                  }
                }}
                className={cn(
                  "group/tf flex items-center justify-center gap-2.5 rounded-2xl border p-4 text-sm font-bold transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/40 shadow-xs scale-[1.01]"
                    : "border-border/80 bg-card text-text hover:border-primary/50 hover:bg-ivory hover:-translate-y-0.5",
                  isSubmitted && "cursor-default opacity-90"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                    isSelected
                      ? "bg-primary text-white shadow-2xs"
                      : "bg-ivory text-text-muted border border-border group-hover/tf:text-primary"
                  )}
                >
                  <Icon className="size-3.5 stroke-[2.5]" />
                </span>
                <span>{value ? "True" : "False"}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <Input
            value={textAnswer ?? ""}
            onChange={(event) => onChangeText(event.target.value)}
            disabled={isSubmitted}
            placeholder="Type your explanation or answer here…"
            aria-label={question.prompt}
          />
        </div>
=======
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={question.prompt}>
          {question.options?.map((option, optionIndex) => (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={selectedOptionIndex === optionIndex}
              disabled={isSubmitted}
              onClick={() => onSelectOption(optionIndex)}
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                selectedOptionIndex === optionIndex
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:bg-ivory",
                isSubmitted && "cursor-default opacity-90",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label={question.prompt}>
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={selectedBoolean === value}
              disabled={isSubmitted}
              onClick={() => onSelectBoolean(value)}
              className={cn(
                "min-h-11 flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                selectedBoolean === value
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:bg-ivory",
                isSubmitted && "cursor-default opacity-90",
              )}
            >
              {value ? "True" : "False"}
            </button>
          ))}
        </div>
>>>>>>> b5abe61 (Implemented 3)
      )}

      {/* Explanation Box */}
      {isSubmitted && result?.explanation && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border/80 bg-ivory/60 p-4 text-xs sm:text-sm text-text animate-fade-scale">
          <Lightbulb className="size-5 shrink-0 text-secondary mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-text">Explanation & Concept Rationale:</p>
            <p className="leading-relaxed text-text-muted">{result.explanation}</p>
          </div>
        </div>
      )}
    </SpotlightCard>
  );
}
