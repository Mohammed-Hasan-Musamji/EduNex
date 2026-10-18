import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "primary" | "accent" | "gold" | "success" | "warning" | "error";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-text-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-secondary",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-error-bg text-error",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const difficultyTone = { beginner: "accent", intermediate: "gold", advanced: "primary" } as const;

export function DifficultyBadge({ difficulty }: { difficulty: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Badge tone={difficultyTone[difficulty]} className="capitalize">
      {difficulty}
    </Badge>
  );
}
