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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
<<<<<<< HEAD
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
=======
        className="absolute inset-0 animate-[enter_200ms_ease-out_both] bg-ink-deep/40 backdrop-blur-[2px]"
>>>>>>> b5abe61 (Implemented 3)
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
<<<<<<< HEAD
        className="relative h-full w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl safe-paddings flex flex-col animate-fade-scale"
=======
        className="relative h-full w-[min(18rem,85vw)] animate-[slide-in_250ms_var(--ease-out)_both] overflow-y-auto bg-card shadow-lg"
>>>>>>> b5abe61 (Implemented 3)
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
<<<<<<< HEAD
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-ivory hover:text-text transition-colors touch-target"
=======
          className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
>>>>>>> b5abe61 (Implemented 3)
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <AppSidebar variant={variant} onNavigate={onClose} />
      </div>
    </div>
  );
}
