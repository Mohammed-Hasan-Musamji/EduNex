import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
}

export function ErrorState({ title = "Something went wrong", description, onRetry, className, children }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-error/35 bg-card p-6 sm:p-8 text-center shadow-lg transition-all animate-fade-scale",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-error/15 text-error ring-1 ring-error/25 shadow-xs">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <div className="max-w-md">
        <p className="font-serif text-base sm:text-lg font-bold text-text">{title}</p>
        <p className="mt-1 text-xs sm:text-sm text-text-muted leading-relaxed">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}
