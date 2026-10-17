"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  enableTilt?: boolean;
  enableSound?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  enableTilt = true,
  enableSound = true,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [tiltStyle, setTiltStyle] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (enableTilt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = -((y - centerY) / centerY) * 4;
      const rotateY = ((x - centerX) / centerX) * 4;
      setTiltStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`);
    }
  };

  const handleMouseEnter = () => {
    if (enableSound) {
      playHoverTick();
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setTiltStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: tiltStyle,
        transition: tiltStyle ? "transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)" : "transform 0.4s ease-out, box-shadow 0.3s ease",
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      {/* Dynamic Cursor Spotlight Beam */}
      {mousePos && (
        <div
          className="pointer-events-none absolute -inset-px z-0 opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(380px circle at ${mousePos.x}px ${mousePos.y}px, var(--color-primary-glow, rgba(185, 111, 82, 0.14)), transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Ambient Top Subtle Glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      {/* Inner Content */}
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
