import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
<<<<<<< HEAD
              "h-10 w-full appearance-none rounded-md border border-border bg-card pl-3 pr-9 text-sm text-text transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
=======
              "h-10 w-full appearance-none rounded-[var(--radius-md)] border border-border bg-card pl-3 pr-9 text-sm text-text shadow-xs hover:border-border-strong",
              "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
>>>>>>> b5abe61 (Implemented 3)
              error && "border-error",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
