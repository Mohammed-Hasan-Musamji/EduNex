import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(errorId, hintId).trim() || undefined}
          className={cn(
<<<<<<< HEAD
            "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-text-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
=======
            "h-10 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-text shadow-xs placeholder:text-text-subtle transition-[border-color,box-shadow] hover:border-border-strong",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
>>>>>>> b5abe61 (Implemented 3)
            error && "border-error",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
