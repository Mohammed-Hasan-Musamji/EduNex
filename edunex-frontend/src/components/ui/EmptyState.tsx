import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 rounded-3xl border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center shadow-xs backdrop-blur-md transition-all duration-300",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 transition-transform duration-300 hover:scale-110 hover:rotate-6">
        <Icon className="size-7" aria-hidden="true" />
      </div>

      <div className="max-w-md space-y-1.5">
        <p className="font-serif text-lg font-bold tracking-tight text-text">{title}</p>
        {description && <p className="text-sm leading-relaxed text-text-muted">{description}</p>}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
