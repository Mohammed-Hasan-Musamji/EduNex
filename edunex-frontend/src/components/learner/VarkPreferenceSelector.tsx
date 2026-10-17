"use client";

import { Eye, Ear, PenLine, Hand } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VarkPreference } from "@/types/learner";
import { cn } from "@/lib/utils";

interface VarkOption {
  value: VarkPreference;
  label: string;
  description: string;
  icon: LucideIcon;
}

const options: VarkOption[] = [
  { value: "visual", label: "Visual", description: "Diagrams, animations, visual explanations.", icon: Eye },
  { value: "auditory", label: "Auditory", description: "Spoken explanations and audio-supported examples.", icon: Ear },
  {
    value: "read_write",
    label: "Read/Write",
    description: "Structured notes, definitions, written examples.",
    icon: PenLine,
  },
  {
    value: "kinesthetic",
    label: "Kinesthetic",
    description: "Interactive activities and simulations.",
    icon: Hand,
  },
];

interface VarkPreferenceSelectorProps {
  value: VarkPreference[];
  onChange: (value: VarkPreference[]) => void;
}

export function VarkPreferenceSelector({ value, onChange }: VarkPreferenceSelectorProps) {
  const toggle = (pref: VarkPreference) => {
    onChange(value.includes(pref) ? value.filter((v) => v !== pref) : [...value, pref]);
  };

  return (
    <fieldset>
      <legend className="text-sm font-medium text-text">
        How do you learn best? <span className="font-normal text-text-muted">(optional)</span>
      </legend>
      <p className="mt-1 text-xs text-text-muted">
        VARK is an optional preference, not a scientific diagnosis — pick as many as you like, or skip this.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggle(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"
                  : "border-border bg-white hover:bg-ivory",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", isSelected ? "text-primary" : "text-text-muted")} aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-text">{option.label}</span>
                <span className="block text-xs text-text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
