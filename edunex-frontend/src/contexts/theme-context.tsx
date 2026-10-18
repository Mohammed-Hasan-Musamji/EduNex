"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { THEME_OPTIONS, type ThemeName, type ThemeOption } from "@/types/theme";
import { useLearner } from "@/hooks/use-learner";
import { playThemeChangeSound } from "@/lib/audio-effects";

interface ThemeContextValue {
  theme: ThemeName;
  activeThemeOption: ThemeOption;
  availableThemes: ThemeOption[];
  setTheme: (theme: ThemeName, triggerSound?: boolean) => void;
  suggestedTheme: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function detectSuggestedTheme(role?: string, varkPreferences?: string[]): ThemeName {
  if (role === "admin") {
    return "indigo";
  }

  if (varkPreferences && varkPreferences.length > 0) {
    if (varkPreferences.includes("visual")) return "indigo";
    if (varkPreferences.includes("kinesthetic")) return "amber";
    if (varkPreferences.includes("auditory")) return "cyan";
    if (varkPreferences.includes("read_write")) return "terracotta";
  }

  return "cyan";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { learner } = useLearner();
  const [theme, setThemeState] = useState<ThemeName>("cyan");
  const [isMounted, setIsMounted] = useState(false);

  const suggestedTheme = detectSuggestedTheme(
    learner?.role,
    learner?.preferences?.varkPreferences
  );

  // Apply theme to DOM documentElement
  const applyThemeToDOM = (themeName: ThemeName) => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", themeName);
    document.documentElement.classList.remove("dark");
  };

  // Sync theme when user changes or first mounts
  useEffect(() => {
    setIsMounted(true);
    const storageKey = learner?.id ? `edunex.theme.${learner.id}` : "edunex.theme.global";
    const savedTheme = localStorage.getItem(storageKey) as ThemeName | null;

    const validThemes: ThemeName[] = ["cyan", "indigo", "amber", "terracotta"];
    if (savedTheme && validThemes.includes(savedTheme)) {
      setThemeState(savedTheme);
      applyThemeToDOM(savedTheme);
    } else {
      const autoTheme = suggestedTheme;
      setThemeState(autoTheme);
      applyThemeToDOM(autoTheme);
    }
  }, [learner?.id, learner?.role, suggestedTheme]);

  const setTheme = useCallback(
    (newTheme: ThemeName, triggerSound = true) => {
      setThemeState(newTheme);
      applyThemeToDOM(newTheme);

      if (triggerSound) {
        playThemeChangeSound();
      }

      const storageKey = learner?.id ? `edunex.theme.${learner.id}` : "edunex.theme.global";
      try {
        localStorage.setItem(storageKey, newTheme);
        localStorage.setItem("edunex.theme.global", newTheme);
      } catch {
        // Ignore quota/private browsing errors
      }
    },
    [learner?.id]
  );

  const activeThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        activeThemeOption,
        availableThemes: THEME_OPTIONS,
        setTheme,
        suggestedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
