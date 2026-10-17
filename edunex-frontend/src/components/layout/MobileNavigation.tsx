"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { PanelVariant } from "@/config/navigation";
import { AppSidebar } from "./AppSidebar";

interface MobileNavigationProps {
  variant: PanelVariant;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ variant, isOpen, onClose }: MobileNavigationProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="relative h-full w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl safe-paddings flex flex-col animate-fade-scale"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-ivory hover:text-text transition-colors touch-target"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <AppSidebar variant={variant} onNavigate={onClose} />
      </div>
    </div>
  );
}
