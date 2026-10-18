"use client";

import { useEffect, useRef } from "react";

interface ParticleCanvasProps {
  role?: "learner" | "admin";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  glowColor: string;
}

export function ParticleCanvas({ role = "learner" }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect user reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse coordinates for interactive constellation physics
    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains("dark");

    // Vibrant, luminous palette tokens
    const vibrantColors = isDark
      ? [
          { color: "56, 189, 248", glow: "#38bdf8" },   // Electric Cyan
          { color: "168, 85, 247", glow: "#a855f7" },  // Vibrant Violet
          { color: "249, 115, 22", glow: "#f97316" },  // Sunset Amber
          { color: "52, 211, 153", glow: "#34d399" },  // Neon Emerald
        ]
      : [
          { color: "14, 165, 233", glow: "#0ea5e9" },  // Ocean Cyan
          { color: "99, 102, 241", glow: "#6366f1" },  // Royal Indigo
          { color: "217, 119, 6", glow: "#d97706" },   // Solar Amber
          { color: "234, 88, 12", glow: "#ea580c" },   // Warm Terracotta
        ];

    // Initialize particles
    const particleCount = Math.min(Math.floor((width * height) / 20000), 65);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const palette = vibrantColors[i % vibrantColors.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 1.2,
        alpha: Math.random() * 0.5 + 0.35,
        color: palette.color,
        glowColor: palette.glow,
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        if (!prefersReducedMotion) {
          p1.x += p1.vx;
          p1.y += p1.vy;

          // Bounce off viewport edges
          if (p1.x < 0 || p1.x > width) p1.vx *= -1;
          if (p1.y < 0 || p1.y > height) p1.vy *= -1;

          // Smooth mouse gravitational interaction
          const dxMouse = mouseX - p1.x;
          const dyMouse = mouseY - p1.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse < 160) {
            const force = (160 - distMouse) / 160;
            p1.x -= (dxMouse / distMouse) * force * 1.8;
            p1.y -= (dyMouse / distMouse) * force * 1.8;
          }
        }

        // Draw particle node with soft luminous glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p1.color}, ${p1.alpha})`;
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.shadowColor = p1.glowColor;
        ctx.fill();
        ctx.restore();

        // Connect with nearby particles with glowing filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 125) {
            const lineAlpha = (1 - dist / 125) * (isDark ? 0.32 : 0.22);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.color}, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor with interactive neon beam
        const dxMouse = mouseX - p1.x;
        const dyMouse = mouseY - p1.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 150) {
          const mouseLineAlpha = (1 - distMouse / 150) * (isDark ? 0.6 : 0.4);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(${p1.color}, ${mouseLineAlpha})`;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [role]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-85 transition-opacity duration-700"
      aria-hidden="true"
    />
  );
}
