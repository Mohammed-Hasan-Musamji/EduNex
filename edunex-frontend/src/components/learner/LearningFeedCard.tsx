import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearningFeedCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function LearningFeedCard({ icon: Icon, title, description, children, className }: LearningFeedCardProps) {
  return (
    <section className={cn("flex h-full flex-col rounded-lg border border-border bg-white p-5", className)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-serif text-base font-medium text-text">{title}</h3>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}
