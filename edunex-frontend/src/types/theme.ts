export type ThemeName = "cyan" | "indigo" | "amber" | "terracotta";

export interface ThemeOption {
  id: ThemeName;
  name: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  varkMatch?: string;
  roleMatch?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "cyan",
    name: "Ocean Cyan",
    tagline: "Luminous Aqua Frost & Adaptive Clarity",
    accentColor: "#0284c7",
    secondaryColor: "#06b6d4",
    varkMatch: "Auditory",
    roleMatch: "Rhythmic Audio",
  },
  {
    id: "indigo",
    name: "Cosmic Indigo",
    tagline: "Modern Lavender Frost & Visual Focus",
    accentColor: "#4f46e5",
    secondaryColor: "#7c3aed",
    varkMatch: "Visual",
    roleMatch: "Visual Focus",
  },
  {
    id: "amber",
    name: "Solar Dynamo",
    tagline: "Sunlight Amber & Dynamic Energy",
    accentColor: "#d97706",
    secondaryColor: "#f59e0b",
    varkMatch: "Kinesthetic",
    roleMatch: "Hands-on Practice",
  },
  {
    id: "terracotta",
    name: "Warm Terracotta",
    tagline: "Cashmere Sunset & Scholarly Warmth",
    accentColor: "#ea580c",
    secondaryColor: "#d97706",
    varkMatch: "Read / Write",
    roleMatch: "Learner Default",
  },
];
