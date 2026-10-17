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
        "flex flex-col items-center gap-3 rounded-lg border border-border bg-error-bg px-6 py-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-7 text-error" aria-hidden="true" />
      <div>
        <p className="font-medium text-text">{title}</p>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}
