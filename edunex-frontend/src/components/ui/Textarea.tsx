import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
<<<<<<< HEAD
            "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-text-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none",
=======
            "w-full rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-sm text-text shadow-xs placeholder:text-text-subtle hover:border-border-strong",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 resize-none",
>>>>>>> b5abe61 (Implemented 3)
            error && "border-error",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
