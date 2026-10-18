import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-3 py-10 text-text-muted", className)}>
      <span className="relative flex size-9" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-surface-3" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </span>
      <p className="text-sm">{label}</p>
    </div>
  );
}
