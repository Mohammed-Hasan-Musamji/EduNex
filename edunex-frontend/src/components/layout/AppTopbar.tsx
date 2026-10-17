"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut, Settings, User } from "lucide-react";
import type { PanelVariant } from "@/config/navigation";
import { routes } from "@/lib/routes";
import { useLearner } from "@/hooks/use-learner";
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
  const userName = variant === "learner" ? (learner?.displayName ?? "Learner") : "Admin";

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
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-ivory hover:text-text lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text hover:bg-ivory"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-secondary/20 text-secondary">
            <User className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{userName}</span>
          <ChevronDown className="size-4 text-text-muted" aria-hidden="true" />
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-white p-1 shadow-md",
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
            {variant === "learner" && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm text-text hover:bg-ivory"
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut();
                  router.push(routes.login);
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Switch profile
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
