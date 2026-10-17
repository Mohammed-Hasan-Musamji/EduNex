"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { cn } from "@/lib/utils";

interface LearningFeedCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  badge?: string;
  badgeTone?: "primary" | "warning" | "success" | "neutral";
  className?: string;
}

export function LearningFeedCard({
  icon: Icon,
  title,
  description,
  children,
  badge,
  badgeTone = "primary",
  className,
}: LearningFeedCardProps) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    neutral: "bg-ivory text-text-muted border-border",
  };

  return (
    <SpotlightCard className={cn("flex flex-col p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-serif text-lg font-semibold tracking-tight text-text transition-colors group-hover:text-primary">
              {title}
            </h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>

        {badge && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide shadow-2xs",
              toneClasses[badgeTone]
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">{children}</div>
    </SpotlightCard>
  );
}
