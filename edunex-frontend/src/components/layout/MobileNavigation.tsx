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
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="relative h-full w-72 bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-ivory hover:text-text"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <AppSidebar variant={variant} onNavigate={onClose} />
      </div>
    </div>
  );
}
