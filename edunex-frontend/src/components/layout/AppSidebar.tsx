"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { navigationPanels, type PanelVariant } from "@/config/navigation";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  variant: PanelVariant;
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({ variant, className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { label: panelLabel, items: navItems } = navigationPanels[variant];

  return (
    <nav aria-label={`${panelLabel} navigation`} className={cn("flex h-full flex-col gap-6 p-4", className)}>
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
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
