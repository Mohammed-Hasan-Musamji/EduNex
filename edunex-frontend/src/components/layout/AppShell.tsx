"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { PanelVariant } from "@/config/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { MobileNavigation } from "./MobileNavigation";
<<<<<<< HEAD
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
=======
import { MobileTabBar } from "./MobileTabBar";
import { cn } from "@/lib/utils";
>>>>>>> b5abe61 (Implemented 3)

interface AppShellProps {
  variant: PanelVariant;
  children: ReactNode;
}

export function AppShell({ variant, children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  return (
<<<<<<< HEAD
    <div className="relative flex min-h-screen bg-ivory">
      {/* Dynamic Animated Aurora Background & Tech Grid for Dashboard */}
      <AnimatedBackground variant="full" showParticles={true} />

      <aside className="relative z-20 hidden w-64 shrink-0 border-r border-border bg-card/95 backdrop-blur-md lg:block">
        <AppSidebar variant={variant} className="sticky top-0" />
=======
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/70 backdrop-blur-sm lg:block">
        <AppSidebar variant={variant} className="sticky top-0 h-screen" />
>>>>>>> b5abe61 (Implemented 3)
      </aside>

      <MobileNavigation variant={variant} isOpen={isMobileNavOpen} onClose={closeMobileNav} />

      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <AppTopbar onMenuClick={() => setIsMobileNavOpen(true)} variant={variant} />
<<<<<<< HEAD
        <main className="relative z-10 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
=======
        <main
          id="main-content"
          tabIndex={-1}
          className={cn("flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8 lg:py-8", variant === "learner" && "pb-24 lg:pb-8")}
        >
          <div className={cn("mx-auto w-full", variant === "admin" ? "max-w-7xl" : "max-w-6xl")}>{children}</div>
>>>>>>> b5abe61 (Implemented 3)
        </main>
      </div>

      {variant === "learner" && <MobileTabBar />}
    </div>
  );
}
