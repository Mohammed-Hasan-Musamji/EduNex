"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut, Settings, User, Flame, Zap, Trophy } from "lucide-react";
import type { PanelVariant } from "@/config/navigation";
import { routes } from "@/lib/routes";
import { useLearner } from "@/hooks/use-learner";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  onMenuClick: () => void;
  variant: PanelVariant;
}

export function AppTopbar({ onMenuClick, variant }: AppTopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { learner, signOut } = useLearner();
  const userName = learner?.displayName ?? (variant === "learner" ? "Learner" : "Admin");

  useEffect(() => {
    if (!isMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-ivory hover:text-text lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* Gamification Stats from reference design (Learner mode) */}
      {variant === "learner" && (
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto py-1 text-xs">
          {/* Streak pill */}
          <span className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 sm:px-3 py-1 font-semibold text-orange-600 dark:text-orange-400 shadow-2xs shrink-0">
            <Flame className="size-3.5 text-orange-500 fill-orange-500 animate-pulse" />
            <span>3 Days</span>
          </span>

          {/* XP pill */}
          <span className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 sm:px-3 py-1 font-semibold text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
            <Zap className="size-3.5 text-amber-500 fill-amber-500" />
            <span>420 XP</span>
          </span>

          {/* Level Badge */}
          <span className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
            <Trophy className="size-3.5 text-emerald-500" />
            <span>Level 4 Scholar</span>
          </span>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ThemeSelector variant="compact" />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 text-sm font-medium text-text transition-colors hover:border-border hover:bg-ivory"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary shadow-2xs ring-1 ring-primary/30">
              <User className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline font-medium">{userName}</span>
            <ChevronDown className="size-3.5 text-text-muted" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl backdrop-blur-xl animate-fade-scale",
              )}
            >
              <Link
                href={routes.admin.analyticsSettings}
                role="menuitem"
                className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-text hover:bg-ivory"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm text-error hover:bg-error-bg"
                onClick={async () => {
                  setIsMenuOpen(false);
                  await signOut();
                  router.push(routes.login);
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
