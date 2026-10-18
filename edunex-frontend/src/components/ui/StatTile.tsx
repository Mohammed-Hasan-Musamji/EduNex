import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  /** Pre-formatted value, or null when there is genuinely nothing to show yet. */
  value: string | null;
  icon: LucideIcon;
  hint?: ReactNode;
  emptyHint?: string;
  tone?: "primary" | "accent" | "gold" | "neutral";
  className?: string;
}

const iconTone = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-secondary",
  neutral: "bg-surface-2 text-text-muted",
};

/** A labelled headline number. Shows an em dash, never a made-up 0%, when there's no data. */
export function StatTile({ label, value, icon: Icon, hint, emptyHint, tone = "neutral", className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-muted">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-full", iconTone[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-text">{value ?? "—"}</p>
      {(value === null ? emptyHint : hint) && (
        <p className="text-xs text-text-subtle">{value === null ? emptyHint : hint}</p>
      )}
    </div>
  );
}
