"use client";

import { Flame, Zap, Award, Check, Lock, Sparkles, Eye, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

interface GamifiedSidebarWidgetsProps {
  xpCurrent?: number;
  xpTarget?: number;
  streakDays?: number;
  varkPreferences?: string[];
}

export function GamifiedSidebarWidgets({
  xpCurrent = 75,
  xpTarget = 100,
  streakDays = 3,
  varkPreferences = ["visual", "kinesthetic"],
}: GamifiedSidebarWidgetsProps) {
  const percent = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));

  const badges = [
    {
      id: "b1",
      icon: "🌱",
      name: "First Step",
      desc: "Lesson completed",
      earned: true,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      id: "b2",
      icon: "🔥",
      name: "Streak Keeper",
      desc: `${streakDays}-day consistency`,
      earned: true,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
    {
      id: "b3",
      icon: "🧠",
      name: "Diagnostic Ready",
      desc: "Skills evaluated",
      earned: true,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      id: "b4",
      icon: "👑",
      name: "Master",
      desc: "Locked [80% req.]",
      earned: false,
      color: "bg-muted/15 text-text-muted border-border/60",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Daily Quest Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Zap className="size-3.5 fill-amber-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text">
              Daily Quest
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-primary">
            {xpCurrent} / {xpTarget} XP
          </span>
        </div>

        {/* Quest Progress Bar */}
        <div className="mt-2 h-2.5 w-full rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-2.5 text-xs text-text-muted leading-relaxed">
          Earn <span className="font-semibold text-text">{xpTarget - xpCurrent} more XP</span> today to maintain your {streakDays}-day flame streak!
        </p>
      </div>

      {/* 2. Recent Badges Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Award className="size-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text">
              Recent Badges
            </span>
          </div>
        </div>

        {/* 2x2 Badges Grid */}
        <div className="grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-200",
                b.color,
                b.earned ? "shadow-2xs hover:scale-105" : "opacity-60"
              )}
            >
              <span className="text-lg mb-1">{b.icon}</span>
              <span className="text-[11px] font-bold text-text truncate w-full">
                {b.name}
              </span>
              <span className="text-[9px] text-text-muted truncate w-full mt-0.5">
                {b.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Your Learning Style (VARK) Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text">
          Your Learning Style (VARK)
        </h3>
        <p className="mt-1 text-[11px] text-text-muted">
          AI adapts lesson formats to these preferences:
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Eye className="size-3" />
            <span>Visual (Diagrams)</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <Hand className="size-3" />
            <span>Kinesthetic (Code)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
