"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

type Particle = {
  start: Point;
  end: Point;
  control1: Point;
  control2: Point;
  progress: number;
  speed: number;
  size: number;
  color: string;
  trail: Point[];
};

const COLORS = ["#BD6548", "#9870C5", "#E7B84D", "#7EAA91"];
const PARTICLE_COUNT = 12;
const MAX_TRAIL_LENGTH = 42;

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomPoint(width: number, height: number): Point {
  return {
    x: random(width * 0.035, width * 0.965),
    y: random(height * 0.04, height * 0.96),
  };
}

function makeParticle(width: number, height: number): Particle {
  const start = randomPoint(width, height);
  const end = randomPoint(width, height);

  return {
    start,
    end,
    control1: {
      x: random(width * 0.05, width * 0.95),
      y: random(height * 0.05, height * 0.95),
    },
    control2: {
      x: random(width * 0.05, width * 0.95),
      y: random(height * 0.05, height * 0.95),
    },
    progress: Math.random() * 0.7,
    speed: random(0.0009, 0.0021),
    size: random(1.5, 3.1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    trail: [],
  };
}

function nextTrajectory(
  particle: Particle,
  width: number,
  height: number,
) {
  particle.start = { ...particle.end };
  particle.end = randomPoint(width, height);
  particle.control1 = {
    x: random(width * 0.05, width * 0.95),
    y: random(height * 0.05, height * 0.95),
  };
  particle.control2 = {
    x: random(width * 0.05, width * 0.95),
    y: random(height * 0.05, height * 0.95),
  };
  particle.progress = 0;
  particle.speed = random(0.0009, 0.0021);
}

function getBezierPoint(particle: Particle): Point {
  const t = particle.progress;
  const inverse = 1 - t;

  return {
    x:
      inverse ** 3 * particle.start.x +
      3 * inverse ** 2 * t * particle.control1.x +
      3 * inverse * t ** 2 * particle.control2.x +
      t ** 3 * particle.end.x,
    y:
      inverse ** 3 * particle.start.y +
      3 * inverse ** 2 * t * particle.control1.y +
      3 * inverse * t ** 2 * particle.control2.y +
      t ** 3 * particle.end.y,
  };
}

export default function ParticleTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let width = 0;
    let height = 0;
    let frameId = 0;
    let disposed = false;
    let particles: Particle[] = [];

    function resizeCanvas() {
      const bounds = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);

      const ctx = canvas!.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        makeParticle(width, height),
      );
    }

    function drawTrail(particle: Particle) {
      if (particle.trail.length < 2) return;

      for (let i = 1; i < particle.trail.length; i++) {
        const previous = particle.trail[i - 1];
        const current = particle.trail[i];
        const fade = i / particle.trail.length;

        context!.beginPath();
        context!.moveTo(previous.x, previous.y);
        context!.lineTo(current.x, current.y);
        context!.strokeStyle = particle.color;
        context!.globalAlpha = fade * 0.46;
        context!.lineWidth = particle.size * fade;
        context!.lineCap = "round";
        context!.stroke();
      }

      context!.globalAlpha = 1;
    }

    function drawParticle(particle: Particle, point: Point) {
      context!.save();
      context!.globalAlpha = 0.2;
      context!.fillStyle = particle.color;
      context!.shadowColor = particle.color;
      context!.shadowBlur = 16;
      context!.beginPath();
      context!.arc(point.x, point.y, particle.size * 2.2, 0, Math.PI * 2);
      context!.fill();

      context!.globalAlpha = 0.9;
      context!.shadowBlur = 7;
      context!.beginPath();
      context!.arc(point.x, point.y, particle.size, 0, Math.PI * 2);
      context!.fill();
      context!.restore();
    }

    function animate() {
      if (disposed) return;

      context!.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          nextTrajectory(particle, width, height);
          particle.trail = [];
        }

        const point = getBezierPoint(particle);
        particle.trail.push(point);

        if (particle.trail.length > MAX_TRAIL_LENGTH) {
          particle.trail.shift();
        }

        drawTrail(particle);
        drawParticle(particle, point);
      }

      frameId = window.requestAnimationFrame(animate);
    }

    resizeCanvas();

    if (!reducedMotion.matches) {
      frameId = window.requestAnimationFrame(animate);
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas();
      context!.clearRect(0, 0, width, height);
    });

    observer.observe(canvas);

    function handleMotionPreference() {
      window.cancelAnimationFrame(frameId);
      context!.clearRect(0, 0, width, height);

      if (!reducedMotion.matches) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    reducedMotion.addEventListener("change", handleMotionPreference);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      context!.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-trails-canvas"
      aria-hidden="true"
    />
  );
}
