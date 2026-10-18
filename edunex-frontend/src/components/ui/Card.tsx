import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts slightly on hover -- for cards that are themselves a link/button target. */
  interactive?: boolean;
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
<<<<<<< HEAD
        "rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition-all duration-200 hover:border-primary/30",
=======
        "rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
>>>>>>> b5abe61 (Implemented 3)
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-lg font-medium text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-muted", className)} {...props} />;
}

/** Small uppercase label above a card's title. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-text-subtle", className)} {...props} />;
}
