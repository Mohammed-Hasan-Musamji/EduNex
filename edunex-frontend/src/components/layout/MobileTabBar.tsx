"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { learnerTabItems } from "@/config/navigation";
import { isActivePath } from "./AppSidebar";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar for learners on phones: the four most-used destinations
 * within thumb reach. Everything else stays in the slide-out menu.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {learnerTabItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-text-subtle hover:text-text",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
