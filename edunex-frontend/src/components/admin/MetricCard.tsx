"use client";

import type { LucideIcon } from "lucide-react";
<<<<<<< HEAD
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { cn } from "@/lib/utils";
=======
import { StatTile } from "@/components/ui/StatTile";
>>>>>>> b5abe61 (Implemented 3)

interface MetricCardProps {
  label: string;
  /** null while loading or when the metric is unavailable. */
  value: string | null;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

<<<<<<< HEAD
export function MetricCard({ label, value, icon: Icon, hint, className = "" }: MetricCardProps) {
  return (
    <SpotlightCard className={cn("p-5 flex-row items-center gap-4", className)}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
        <p className="mt-0.5 font-serif text-2xl font-bold tracking-tight text-text truncate">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-text-muted truncate">{hint}</p>}
      </div>
    </SpotlightCard>
  );
=======
export function MetricCard({ label, value, icon, hint }: MetricCardProps) {
  return <StatTile label={label} value={value} icon={icon} hint={hint} emptyHint="Loading…" tone="primary" />;
>>>>>>> b5abe61 (Implemented 3)
}
