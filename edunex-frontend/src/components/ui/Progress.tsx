"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "gold" | "success";

const barTone: Record<Tone, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  gold: "bg-gold",
  success: "bg-success",
};

const ringTone: Record<Tone, string> = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  gold: "var(--color-gold)",
  success: "var(--color-success)",
};

/** Animates from 0 to the target once mounted (CSS transition; instant under reduced motion). */
function useMountedValue(value: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  tone?: Tone;
  className?: string;
  size?: "sm" | "md";
}

export function ProgressBar({ value, max = 100, label, tone = "primary", className, size = "sm" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const shown = useMountedValue(pct);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barTone[tone])}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label: string;
  children?: ReactNode;
}

export function ProgressRing({ value, max = 100, size = 88, stroke = 8, tone = "primary", label, children }: ProgressRingProps) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const shown = useMountedValue(pct);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringTone[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
