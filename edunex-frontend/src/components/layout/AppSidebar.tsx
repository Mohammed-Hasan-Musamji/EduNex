"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, GraduationCap, Sparkles } from "lucide-react";
import { navigationPanels, type PanelVariant } from "@/config/navigation";
<<<<<<< HEAD
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
=======
import { useOptionalGamification } from "@/components/gamification/GamificationProvider";
import { ProgressBar } from "@/components/ui/Progress";
import { routes } from "@/lib/routes";
>>>>>>> b5abe61 (Implemented 3)
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  variant: PanelVariant;
  className?: string;
  onNavigate?: () => void;
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ variant, className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { label: panelLabel, items: navItems } = navigationPanels[variant];
  const gamification = useOptionalGamification();
  const summary = variant === "learner" ? gamification?.summary : null;

  return (
    <nav aria-label={`${panelLabel} navigation`} className={cn("flex h-full flex-col gap-6 p-4", className)}>
<<<<<<< HEAD
      <Link
        href="/"
        className="group flex items-center gap-2.5 px-2 py-1 transition-transform hover:scale-[1.02]"
        onMouseEnter={playHoverTick}
        onClick={(e) => {
          playClickSound();
          onNavigate?.();
        }}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-white shadow-md shadow-primary/20 transition-transform duration-300 group-hover:rotate-6">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div>
          <span className="block font-serif text-lg font-bold leading-tight text-text">EduNex</span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary">
            {panelLabel}
          </span>
        </div>
      </Link>

      <ul className="flex flex-1 flex-col gap-1.5">
=======
      <Link href="/" className="flex items-center gap-2.5 px-2 py-1" onClick={onNavigate}>
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-serif text-lg font-semibold leading-tight text-text">EduNex</span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-subtle">{panelLabel}</span>
        </span>
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5">
>>>>>>> b5abe61 (Implemented 3)
        {navItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onMouseEnter={playHoverTick}
                onClick={() => {
                  playClickSound();
                  onNavigate?.();
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
<<<<<<< HEAD
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-xs"
                    : "text-text-muted hover:bg-ivory hover:text-text hover:translate-x-0.5"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-primary" : "text-text-muted group-hover:text-text"
                  )}
                  aria-hidden="true"
                />
=======
                  "group relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
>>>>>>> b5abe61 (Implemented 3)
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {summary && (
        <Link
          href={routes.learner.progress}
          onClick={onNavigate}
          className="rounded-[var(--radius-lg)] border border-border bg-gradient-to-br from-gold-soft/70 to-card p-3 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-text">
              <Sparkles className="size-3.5 text-gold" aria-hidden="true" /> Level {summary.level}
            </span>
            <span className="inline-flex items-center gap-1 text-text-muted">
              <Flame className="size-3.5 text-primary" aria-hidden="true" /> {summary.currentStreak}d
            </span>
          </div>
          <ProgressBar
            className="mt-2"
            tone="gold"
            value={summary.xpTotal - summary.levelFloorXp}
            max={summary.nextLevelXp - summary.levelFloorXp}
            label={`Progress to level ${summary.level + 1}`}
          />
          <p className="mt-1.5 text-[11px] text-text-subtle">
            {summary.xpTotal} XP · {summary.nextLevelXp - summary.xpTotal} to next level
          </p>
        </Link>
      )}
    </nav>
  );
}
