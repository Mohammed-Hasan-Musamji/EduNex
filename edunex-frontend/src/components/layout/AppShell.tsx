"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { PanelVariant } from "@/config/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { MobileNavigation } from "./MobileNavigation";

interface AppShellProps {
  variant: PanelVariant;
  children: ReactNode;
}

export function AppShell({ variant, children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ivory">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <AppSidebar variant={variant} className="sticky top-0" />
      </aside>

      <MobileNavigation variant={variant} isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppTopbar onMenuClick={() => setIsMobileNavOpen(true)} variant={variant} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
