import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3",
          "has-[:checked]:border-primary has-[:checked]:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]",
          className,
        )}
      >
        <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-border bg-card">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            {...props}
          />
          <Check
            className="pointer-events-none hidden size-3.5 text-primary peer-checked:block"
            aria-hidden="true"
          />
        </span>
        <span>
          <span className="block text-sm font-medium text-text">{label}</span>
          {description && <span className="block text-xs text-text-muted">{description}</span>}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
