"use client";

import { useEffect, useMemo } from "react";
import { Award, Flame, Sparkles, TrendingUp, X } from "lucide-react";
import type { RewardSummary } from "@/types/engagement";

interface CelebrationProps {
  rewards: RewardSummary;
  title: string;
  message?: string;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["var(--color-primary)", "var(--color-gold)", "var(--color-accent)", "var(--viz-heat-1)"];
const AUTO_DISMISS_MS = 7000;

/**
 * A non-modal celebration card. It never blocks the page or the next action:
 * it sits in a corner, is announced politely to screen readers, can be
 * dismissed, and closes itself. The confetti burst is skipped entirely
 * under prefers-reduced-motion (see globals.css .confetti-piece).
 */
export function Celebration({ rewards, title, message, onDismiss }: CelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isMilestone = rewards.newAchievements.length > 0 || rewards.leveledUp;
  const pieces = useMemo(
    () =>
      isMilestone
        ? Array.from({ length: 18 }, (_, i) => ({
            left: `${10 + ((i * 47) % 80)}%`,
            dx: `${((i * 37) % 120) - 60}px`,
            dy: `${120 + ((i * 53) % 90)}px`,
            rot: `${(i % 2 ? 1 : -1) * (180 + ((i * 61) % 360))}deg`,
            delay: `${(i % 6) * 40}ms`,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }))
        : [],
    [isMilestone],
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem] lg:bottom-6"
    >
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-gold/40 bg-card p-4 shadow-lg animate-scale-in">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0">
          {pieces.map((p, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={
                {
                  left: p.left,
                  top: 0,
                  background: p.color,
                  animationDelay: p.delay,
                  "--dx": p.dx,
                  "--dy": p.dy,
                  "--rot": p.rot,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-gold to-accent" />

        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 animate-pop items-center justify-center rounded-full bg-gold-soft text-secondary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base font-semibold text-text">{title}</p>
            {message && <p className="mt-0.5 text-sm text-text-muted">{message}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rewards.xpAwarded > 0 && (
                <span className="inline-flex animate-pop items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-semibold text-secondary">
                  +{rewards.xpAwarded} XP
                </span>
              )}
              {rewards.leveledUp && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  <TrendingUp className="size-3" aria-hidden="true" /> Level {rewards.level}
                </span>
              )}
              {rewards.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  <Flame className="size-3" aria-hidden="true" /> {rewards.currentStreak}-day streak
                </span>
              )}
            </div>
            {rewards.newAchievements.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {rewards.newAchievements.map((a) => (
                  <li key={a.code} className="flex items-start gap-2 rounded-md bg-ivory px-2.5 py-2 text-sm">
                    <Award className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                    <span>
                      <span className="font-medium text-text">{a.title}</span>
                      <span className="block text-xs text-text-muted">{a.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {rewards.notes.map((note) => (
              <p key={note} className="mt-2 text-xs text-text-subtle">
                {note}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
