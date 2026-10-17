"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette, Sparkles, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  variant?: "dropdown" | "compact" | "pills";
  className?: string;
}

export function ThemeSelector({ variant = "dropdown", className = "" }: ThemeSelectorProps) {
  const { theme, activeThemeOption, availableThemes, setTheme, suggestedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (variant === "pills") {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {availableThemes.map((opt) => {
          const isSelected = opt.id === theme;
          return (
            <button
              key={opt.id}
              type="button"
              onMouseEnter={playHoverTick}
              onClick={() => {
                playClickSound();
                setTheme(opt.id);
              }}
              className={cn(
                "group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                isSelected
                  ? "bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary ring-offset-2"
                  : "bg-card/80 text-text-muted hover:bg-card hover:text-text border border-border/80 backdrop-blur-sm"
              )}
            >
              <span
                className="size-2.5 rounded-full ring-1 ring-white/50"
                style={{ backgroundColor: opt.accentColor }}
                aria-hidden="true"
              />
              <span>{opt.name.replace("Warm ", "").replace("Cosmic ", "").replace("Ocean ", "")}</span>
              {opt.id === suggestedTheme && !isSelected && (
                <span className="size-1.5 rounded-full bg-secondary animate-pulse" title="Suggested for your profile" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onMouseEnter={playHoverTick}
        onClick={() => {
          playClickSound();
          setIsOpen(!isOpen);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-text shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md",
          isOpen && "border-primary ring-2 ring-primary/20"
        )}
      >
        <span
          className="size-3.5 rounded-full ring-2 ring-white/80 shadow-xs transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${activeThemeOption.accentColor}, ${activeThemeOption.secondaryColor})`,
          }}
          aria-hidden="true"
        />
        <span className="font-medium text-text">{activeThemeOption.name}</span>
        <ChevronDown
          className={cn("size-3.5 text-text-muted transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 max-h-[calc(100vh-5rem)] overflow-y-auto origin-top-right rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur-xl animate-fade-scale"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
              <Palette className="size-3.5 text-primary" aria-hidden="true" />
              <span>Personalize Theme</span>
            </div>
            <span className="text-[10px] text-text-muted">Auto-adapts to role/VARK</span>
          </div>

          <div className="mt-1 space-y-1">
            {availableThemes.map((opt) => {
              const isSelected = opt.id === theme;
              const isSuggested = opt.id === suggestedTheme;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onMouseEnter={playHoverTick}
                  onClick={() => {
                    playClickSound();
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text hover:bg-ivory/80 hover:translate-x-0.5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-4 shrink-0 rounded-full shadow-xs ring-2 ring-white/80 transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${opt.accentColor}, ${opt.secondaryColor})`,
                      }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium leading-snug">
                        <span>{opt.name}</span>
                        {isSuggested && (
                          <span className="flex items-center gap-0.5 rounded-full bg-secondary/15 px-1.5 py-0.2 text-[9px] font-semibold text-secondary">
                            <Sparkles className="size-2.5" /> For You
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] text-text-muted">{opt.tagline}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="size-4 shrink-0 text-primary animate-badge-pop" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
