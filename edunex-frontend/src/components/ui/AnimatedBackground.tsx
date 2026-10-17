"use client";

import { ParticleCanvas } from "@/components/auth/ParticleCanvas";

interface AnimatedBackgroundProps {
  variant?: "full" | "subtle" | "portal";
  showParticles?: boolean;
  className?: string;
}

export function AnimatedBackground({
  variant = "full",
  showParticles = true,
  className = "",
}: AnimatedBackgroundProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden transition-colors duration-700 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Ambient Radial Gradient Foundation using Theme Variables */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `
            radial-gradient(ellipse 90% 65% at 50% -10%, var(--color-primary-glow) 0%, transparent 60%),
            radial-gradient(ellipse 75% 55% at 100% 100%, var(--color-primary-glow) 0%, transparent 65%),
            radial-gradient(ellipse 65% 45% at 0% 100%, var(--color-primary-glow) 0%, transparent 60%)
          `,
        }}
      />

      {/* 2. Primary Vivid Floating Aurora Orb (Top Left) */}
      <div
        className="absolute -top-36 -left-36 size-[32rem] sm:size-[46rem] rounded-full blur-3xl animate-float-slow transition-all duration-700"
        style={{
          background: `radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 50%, transparent 75%)`,
          opacity: variant === "subtle" ? 0.12 : 0.18,
        }}
      />

      {/* 3. Secondary Electric Aurora Orb (Bottom Right) */}
      <div
        className="absolute -bottom-44 -right-40 size-[34rem] sm:size-[50rem] rounded-full blur-3xl animate-float-reverse transition-all duration-700"
        style={{
          background: `radial-gradient(circle, var(--color-secondary) 0%, var(--color-primary) 55%, transparent 75%)`,
          opacity: variant === "subtle" ? 0.1 : 0.15,
        }}
      />

      {/* 4. Central Breathing Light Core */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[26rem] sm:size-[38rem] rounded-full blur-2xl animate-pulse-glow transition-all duration-700"
        style={{
          background: `radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 60%, transparent 80%)`,
          opacity: variant === "subtle" ? 0.06 : 0.10,
        }}
      />

      {/* 5. Sweeping Radiant Light Ray (Visual dynamism for full & portal variants) */}
      {variant !== "subtle" && (
        <div
          className="absolute inset-[-50%] mix-blend-screen animate-spin-slow pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, var(--color-secondary) 60deg, transparent 120deg, var(--color-primary) 240deg, transparent 360deg)`,
            animationDuration: "35s",
            opacity: 0.06,
          }}
        />
      )}

      {/* 6. Modern Technical Grid with Smooth Vignette Radial Fade */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 50%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 50%, transparent 95%)",
        }}
      />

      {/* 7. Interactive Constellation Canvas */}
      {showParticles && <ParticleCanvas />}

      {/* 8. Top & Bottom Subtle Edge Vignettes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0%, transparent 20%, transparent 80%, rgba(255, 255, 255, 0.7) 100%)",
        }}
      />
    </div>
  );
}
