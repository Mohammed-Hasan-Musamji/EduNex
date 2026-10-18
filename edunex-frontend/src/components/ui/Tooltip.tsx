import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight hover/focus tooltip. The trigger must be focusable (a button
 * or link) so keyboard users get the same information as pointer users.
 */
export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-60 -translate-x-1/2 translate-y-1 rounded-md bg-ink-deep px-2.5 py-1.5 text-xs leading-snug text-white opacity-0 shadow-md transition duration-150 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
