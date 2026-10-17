"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Play,
  Lock,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { routes, buildLearnUrl } from "@/lib/routes";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface CurriculumUnit {
  id: string;
  title: string;
  description: string;
  status: "mastered" | "current" | "locked";
  statusLabel: string;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
}

const DEFAULT_UNITS: CurriculumUnit[] = [
  {
    id: "unit-1",
    title: "Node Anatomy & Memory Models",
    description: "Understanding data payloads, pointer references, and heap memory allocation.",
    status: "mastered",
    statusLabel: "100% Mastered",
  },
  {
    id: "unit-2",
    title: "Singly Linked List: Insertion & Deletion",
    description: "Interactive whiteboard simulation with pointer updates & O(1) head insertion.",
    status: "current",
    statusLabel: "Current Unit",
    badge: "+25 XP Reward",
    ctaText: "Open Interactive Simulation",
    ctaHref: routes.learner.learn,
  },
  {
    id: "unit-3",
    title: "Two-Pointer Traversal & Fast-Slow Pointers",
    description: "Cycle detection (Floyd's algorithm) and middle element extraction.",
    status: "locked",
    statusLabel: "Unlocks at Level 5",
  },
  {
    id: "unit-4",
    title: "Unit Mastery Assessment",
    description: "5-question adaptive quiz with automatic learning gap remediation.",
    status: "locked",
    statusLabel: "Final Milestone",
    ctaText: "Take Skills Checkup",
    ctaHref: routes.learner.practice,
  },
];

export function AdaptiveCurriculumSection() {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-text">Your Adaptive Curriculum</h2>
        </div>
        <span className="rounded-full border border-border/80 bg-ivory px-3 py-1 text-xs font-semibold text-text-muted shadow-2xs">
          Data Structures Track
        </span>
      </div>

      {/* Curriculum Units List */}
      <div className="space-y-3">
        {DEFAULT_UNITS.map((unit) => {
          const isMastered = unit.status === "mastered";
          const isCurrent = unit.status === "current";
          const isLocked = unit.status === "locked";

          return (
            <div
              key={unit.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-200",
                isCurrent
                  ? "border-primary/50 bg-card shadow-md ring-1 ring-primary/20"
                  : isMastered
                  ? "border-emerald-500/30 bg-card/90 shadow-2xs"
                  : "border-border/70 bg-card/60 opacity-80"
              )}
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                {/* Left Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isMastered ? (
                    <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-5" />
                    </span>
                  ) : isCurrent ? (
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary animate-pulse">
                      <Play className="size-4 fill-primary" />
                    </span>
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-xl bg-muted/20 text-text-muted">
                      <Lock className="size-4" />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="font-serif text-sm sm:text-base font-bold text-text truncate">
                      {unit.title}
                    </h3>

                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                        isMastered && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        isCurrent && "bg-primary/15 text-primary",
                        isLocked && "bg-muted/15 text-text-muted"
                      )}
                    >
                      {unit.statusLabel}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                    {unit.description}
                  </p>

                  {/* Action row for active unit */}
                  {unit.ctaText && unit.ctaHref && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-3">
                      <Link
                        href={unit.ctaHref}
                        onMouseEnter={playHoverTick}
                        onClick={playClickSound}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs",
                          isCurrent
                            ? "bg-primary text-white hover:bg-primary-hover shadow-primary/20"
                            : "border border-border bg-ivory text-text hover:bg-card"
                        )}
                      >
                        <span>{unit.ctaText}</span>
                        <ArrowRight className="size-3.5" />
                      </Link>

                      {unit.badge && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Sparkles className="size-3" />
                          <span>{unit.badge}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Focus Area Detected Alert Card (Gap Remediation) */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
            <AlertTriangle className="size-5" />
          </span>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
              Focus Area Detected: Pointer Null-Safety
            </h4>
            <p className="mt-1 text-xs text-text-muted leading-relaxed">
              During your last quiz, you missed an edge case when traversing an empty list (
              <code className="bg-red-500/10 px-1 py-0.5 rounded text-red-700 dark:text-red-300 font-mono text-[11px]">
                head == null
              </code>
              ). We&apos;ve prioritized an interactive drill on the whiteboard.
            </p>

            <div className="mt-2.5">
              <Link
                href={routes.learner.practice}
                onMouseEnter={playHoverTick}
                onClick={playClickSound}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
              >
                <span>Practice Empty List Edge Cases</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
