"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number; // degrees
  role?: "learner" | "admin";
}

export function Card3D({ children, className = "", maxTilt = 7, role = "learner" }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    // Skip on touch-only devices or if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransformStyle(
      `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
    );

    setGlareStyle({
      opacity: 0.35,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle("perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  const borderBeamColor =
    role === "admin"
      ? "from-transparent via-[#8c4832] to-transparent"
      : "from-transparent via-[#b96f52] to-transparent";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: transformStyle ? "transform 0.12s cubic-bezier(0.2, 0, 0.2, 1)" : "transform 0.5s ease-out",
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-2xl sm:rounded-3xl ${className}`}
    >
      {/* Animated Glowing Traveling Border Beam */}
      <div
        className="pointer-events-none absolute -inset-[1.5px] rounded-2xl sm:rounded-3xl overflow-hidden opacity-90 transition-opacity duration-300"
        aria-hidden="true"
      >
        <div
          className="absolute -inset-[200%] animate-spin-slow bg-conic from-transparent via-primary/80 via-secondary/60 to-transparent"
          style={{ animationDuration: "8s" }}
        />
      </div>

      {/* Main Glass Card Surface with dynamic theme adaptation */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 shadow-2xl backdrop-blur-2xl bg-card/95 border border-border/80 text-text">
        {/* Dynamic Specular Light Glare that follows cursor */}
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            opacity: glareStyle.opacity,
            background: `radial-gradient(circle 420px at ${glareStyle.x}% ${glareStyle.y}%, rgba(255, 255, 255, 0.14), transparent 75%)`,
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
