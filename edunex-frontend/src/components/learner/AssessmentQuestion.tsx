import { CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { AssessmentQuestion as AssessmentQuestionType, QuestionResult } from "@/types/assessment";

interface AssessmentQuestionProps {
  question: AssessmentQuestionType;
  index: number;
  selectedOptionIndex?: number;
  selectedBoolean?: boolean;
  textAnswer?: string;
  result?: QuestionResult;
  onSelectOption: (index: number) => void;
  onSelectBoolean: (value: boolean) => void;
  onChangeText: (value: string) => void;
}

export function AssessmentQuestion({
  question,
  index,
  selectedOptionIndex,
  selectedBoolean,
  textAnswer,
  result,
  onSelectOption,
  onSelectBoolean,
  onChangeText,
}: AssessmentQuestionProps) {
  const isSubmitted = Boolean(result);

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-text">
          {index + 1}. {question.prompt}
        </p>
        {isSubmitted &&
          (result!.correct ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Correct" />
          ) : (
            <XCircle className="size-5 shrink-0 text-error" aria-label="Incorrect" />
          ))}
      </div>

      {question.type === "multiple_choice" ? (
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
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                selectedOptionIndex === optionIndex
                  ? "border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"
                  : "border-border bg-white hover:bg-ivory",
                isSubmitted && "cursor-default opacity-90",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : question.type === "true_false" ? (
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
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                selectedBoolean === value
                  ? "border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"
                  : "border-border bg-white hover:bg-ivory",
                isSubmitted && "cursor-default opacity-90",
              )}
            >
              {value ? "True" : "False"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <Input
            value={textAnswer ?? ""}
            onChange={(event) => onChangeText(event.target.value)}
            disabled={isSubmitted}
            placeholder="Type your answer"
            aria-label={question.prompt}
          />
        </div>
      )}

      {isSubmitted && result?.explanation && (
        <p className="mt-3 text-sm text-text-muted" role="status">
          {result.explanation}
        </p>
      )}
    </div>
  );
}
