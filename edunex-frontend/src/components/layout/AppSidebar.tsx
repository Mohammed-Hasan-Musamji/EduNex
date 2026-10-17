"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { navigationPanels, type PanelVariant } from "@/config/navigation";
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
      <Link href="/" className="flex items-center gap-2 px-2 py-1" onClick={onNavigate}>
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-white">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-serif text-lg font-semibold leading-tight text-text">EduNex</span>
          <span className="block text-[11px] uppercase tracking-wide text-text-muted">{panelLabel}</span>
        </span>
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-primary"
                    : "text-text-muted hover:bg-ivory hover:text-text",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
