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
<<<<<<< HEAD
        "flex flex-col items-center justify-center gap-3.5 rounded-3xl border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center shadow-xs backdrop-blur-md transition-all duration-300",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 transition-transform duration-300 hover:scale-110 hover:rotate-6">
        <Icon className="size-7" aria-hidden="true" />
=======
        "flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-card/70 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <p className="font-serif text-base font-medium text-text">{title}</p>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
>>>>>>> b5abe61 (Implemented 3)
      </div>

      <div className="max-w-md space-y-1.5">
        <p className="font-serif text-lg font-bold tracking-tight text-text">{title}</p>
        {description && <p className="text-sm leading-relaxed text-text-muted">{description}</p>}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
