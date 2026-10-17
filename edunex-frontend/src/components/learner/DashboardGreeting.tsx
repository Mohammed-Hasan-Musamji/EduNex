"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Compass, Flame, RefreshCw, Sparkles, Target, Zap } from "lucide-react";
import { playClickSound, playHoverTick, playMascotChirp } from "@/lib/audio-effects";
import { routes } from "@/lib/routes";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

interface DashboardGreetingProps {
  displayName: string;
  varkPreference?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardGreeting({
  displayName,
  varkPreference,
  onRefresh,
  isRefreshing = false,
}: DashboardGreetingProps) {
  const { activeThemeOption } = useTheme();
  const [showMascotTip, setShowMascotTip] = useState(false);

  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm backdrop-blur-xl transition-all duration-300">
      {/* Background Soft Mesh Ambient Glow */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full blur-3xl opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeThemeOption.accentColor}, ${activeThemeOption.secondaryColor})`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full blur-3xl opacity-15 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeThemeOption.secondaryColor}, ${activeThemeOption.accentColor})`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top Goal Badge & Mascot Trigger */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            DAILY GOAL ACTIVE
          </span>

          <div className="flex items-center gap-2">
            {/* Interactive Mini Nexi Mascot Buddy Trigger */}
            <button
              type="button"
              onMouseEnter={() => {
                playHoverTick();
                setShowMascotTip(true);
              }}
              onMouseLeave={() => setShowMascotTip(false)}
              onClick={() => {
                playMascotChirp();
                setShowMascotTip((prev) => !prev);
              }}
              aria-label="Ask Nexi learning coach"
              className="relative inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-white"
            >
              <Bot className="size-3.5 animate-bounce" />
              <span>Nexi AI</span>

              {/* Hover Speech Bubble */}
              {showMascotTip && (
                <div className="absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-normal text-text shadow-xl animate-fade-scale">
                  ✨ “You&apos;re on a 3-day roll, {displayName}! Ready for Linked Lists?”
                  <div className="absolute -top-1 right-4 size-2 rotate-45 border-l border-t border-border bg-card" />
                </div>
              )}
            </button>

            {/* Refresh telemetry */}
            {onRefresh && (
              <button
                type="button"
                disabled={isRefreshing}
                onMouseEnter={playHoverTick}
                onClick={() => {
                  playClickSound();
                  onRefresh();
                }}
                title="Refresh metrics"
                className={cn(
                  "flex items-center justify-center rounded-xl border border-border bg-card p-1.5 text-text-muted shadow-2xs transition-all duration-200 hover:border-primary/40 hover:text-text",
                  isRefreshing && "text-primary border-primary animate-pulse"
                )}
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Greeting & Dynamic Motivation Heading */}
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Welcome back, <span className="text-primary">{displayName}!</span>
          </h1>

          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-text-muted leading-relaxed">
            You are on a <span className="font-semibold text-text">3-day learning streak</span>! Complete today&apos;s Linked List traversal practice to earn your <span className="font-semibold text-primary">&ldquo;Concept Mastered&rdquo;</span> badge and <span className="font-semibold text-amber-600 dark:text-amber-400">+30 XP</span>.
          </p>
        </div>

        {/* Action CTAs & Badges Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={routes.learner.learn}
            onMouseEnter={playHoverTick}
            onClick={playClickSound}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/35 active:translate-y-0"
          >
            <span>Continue Lesson: Linked Lists</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href={routes.learner.practice}
            onMouseEnter={playHoverTick}
            onClick={playClickSound}
            className="group flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-ivory hover:shadow-md"
          >
            <span>Take 3-Min Skills Checkup</span>
          </Link>

          <Link
            href={routes.learner.subjects}
            onMouseEnter={playHoverTick}
            onClick={playClickSound}
            className="group ml-auto hidden sm:flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
          >
            <Compass className="size-3.5" />
            <span>Browse All Subjects &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
