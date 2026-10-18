"use client";

import {
  Atom,
  Binary,
  BookOpen,
  Check,
  Cpu,
  Database,
  FlaskConical,
  Layers,
  Sigma,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import type { Subject } from "@/types/content";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  subject: Subject;
  isSelected: boolean;
  onSelect: () => void;
}

<<<<<<< HEAD
export function SubjectCard({ subject, isSelected, isDemo, onSelect }: SubjectCardProps) {
  const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("data structure") || lower.includes("computer science")) return Binary;
    if (lower.includes("physics")) return Atom;
    if (lower.includes("chemistry")) return FlaskConical;
    if (lower.includes("calculus") || lower.includes("math")) return Sigma;
    if (lower.includes("operating system")) return Cpu;
    if (lower.includes("database") || lower.includes("dbms")) return Database;
    return BookOpen;
  };

  const Icon = getSubjectIcon(subject.name);

=======
export function SubjectCard({ subject, isSelected, onSelect }: SubjectCardProps) {
>>>>>>> b5abe61 (Implemented 3)
  return (
    <button
      type="button"
      onClick={() => {
        playClickSound();
        onSelect();
      }}
      onMouseEnter={playHoverTick}
      aria-pressed={isSelected}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
<<<<<<< HEAD
      <SpotlightCard
        className={cn(
          "flex h-full flex-col justify-between p-6 transition-all duration-300",
          isSelected
            ? "border-primary ring-2 ring-primary/60 bg-primary/5 shadow-xl shadow-primary/15 -translate-y-1"
            : "border-border/80 bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
        )}
      >
        <div>
          <div className="flex w-full items-start justify-between gap-3">
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6",
                isSelected
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-primary/10 text-primary ring-1 ring-primary/20"
              )}
            >
              <Icon className="size-5.5" aria-hidden="true" />
            </span>

            <div className="flex items-center gap-1.5">
              {isSelected && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs animate-badge-pop">
                  <Check className="size-3" /> Selected
                </span>
              )}
              {isDemo && (
                <span className="rounded-full border border-border/80 bg-ivory px-2.5 py-0.5 text-[10px] font-medium text-text-muted">
                  Demo
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-serif text-lg font-bold tracking-tight text-text transition-colors group-hover:text-primary">
              {subject.name}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-muted line-clamp-2">
              {subject.description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-medium text-text-muted">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-secondary" />
            <span>
              {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}
            </span>
          </span>

          <span className="text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            Choose &rarr;
          </span>
        </div>
      </SpotlightCard>
=======
      <div className="flex w-full items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-md bg-secondary/15 text-secondary">
          <BookOpen className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="font-serif text-base font-medium text-text">{subject.name}</p>
        <p className="mt-1 text-sm text-text-muted">{subject.description}</p>
      </div>
      <p className="mt-auto text-xs font-medium text-text-muted">
        {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}
      </p>
>>>>>>> b5abe61 (Implemented 3)
    </button>
  );
}
