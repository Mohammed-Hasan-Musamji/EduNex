import { BookOpen } from "lucide-react";
import type { Subject } from "@/types/content";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  subject: Subject;
  isSelected: boolean;
  isDemo?: boolean;
  onSelect: () => void;
}

export function SubjectCard({ subject, isSelected, isDemo, onSelect }: SubjectCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex h-full flex-col items-start gap-3 rounded-lg border bg-white p-4 text-left transition-colors",
        isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex w-full items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-md bg-secondary/15 text-secondary">
          <BookOpen className="size-4" aria-hidden="true" />
        </span>
        {isDemo && (
          <span className="rounded-full bg-ivory px-2 py-0.5 text-[10px] font-medium text-text-muted">Demo</span>
        )}
      </div>
      <div>
        <p className="font-serif text-base font-medium text-text">{subject.name}</p>
        <p className="mt-1 text-sm text-text-muted">{subject.description}</p>
      </div>
      <p className="mt-auto text-xs font-medium text-text-muted">
        {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}
      </p>
    </button>
  );
}
