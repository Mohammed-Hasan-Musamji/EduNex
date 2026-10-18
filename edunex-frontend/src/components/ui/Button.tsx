import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
<<<<<<< HEAD
  primary: "bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-[0.98] transition-all",
  secondary: "bg-card text-text border border-border hover:bg-ivory hover:border-primary/40 active:scale-[0.98] transition-all",
  ghost: "bg-transparent text-text hover:bg-ivory transition-colors",
  danger: "bg-error text-white hover:opacity-90 active:scale-[0.98] transition-all",
=======
  primary:
    "bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),var(--shadow-xs)] hover:bg-primary-hover hover:shadow-sm",
  accent: "bg-accent text-white shadow-xs hover:bg-accent-hover hover:shadow-sm",
  secondary: "bg-card text-text border border-border shadow-xs hover:border-border-strong hover:bg-ivory",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  danger: "bg-error text-white hover:opacity-90",
>>>>>>> b5abe61 (Implemented 3)
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * Shared button styling, also used to style Links that act as buttons so
 * every primary action in the app looks and responds the same.
 */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium whitespace-nowrap",
    "transition-[background-color,box-shadow,border-color,transform] duration-150 ease-out active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={buttonClasses(variant, size, className)}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
