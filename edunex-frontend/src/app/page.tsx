"use client";

import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  Compass,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sparkle,
} from "lucide-react";
import { appConfig } from "@/config/app";
import { routes } from "@/lib/routes";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ivory safe-paddings">
      {/* Dynamic Animated Aurora Mesh, Tech Grid & Interactive Particles */}
      <AnimatedBackground variant="full" />

      {/* Responsive Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-5 sm:py-7">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-primary text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
            <GraduationCap className="size-5 sm:size-6" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-text">
            {appConfig.name}
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeSelector variant="compact" />

          <Link
            href={`${routes.login}?role=admin`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-text-muted hover:text-text hover:bg-card border border-transparent hover:border-border transition-all"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Admin</span>
          </Link>
          <Link
            href={routes.login}
            className="rounded-lg border border-border/80 bg-card/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-text hover:bg-card hover:border-primary/40 transition-all shadow-xs"
          >
            Sign in
          </Link>
          <Link
            href={routes.register}
            className="rounded-lg bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-primary-hover active:scale-95 transition-all shadow-xs hover:shadow-md"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/85 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-xs animate-fade-scale">
          <Sparkles className="size-3.5 animate-pulse" />
          <span>AI-Powered Adaptive Learning Architecture</span>
        </div>

        <h1 className="mt-6 font-serif text-3xl font-extrabold leading-tight text-text sm:text-5xl md:text-6xl max-w-3xl">
          {appConfig.tagline}
        </h1>

        <p className="mt-5 max-w-2xl text-balance text-sm sm:text-base md:text-lg text-text-muted leading-relaxed">
          EduNex dynamically adapts every lesson to your personal goals and demonstrated comprehension —
          featuring a real-time interactive AI whiteboard, VARK learning preferences, and continuous mastery assessment.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col xs:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            href={routes.register}
            className="w-full xs:w-auto rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Start learning for free</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={routes.learner.learn}
            className="w-full xs:w-auto rounded-xl border border-border/80 bg-card/85 px-6 py-3.5 text-sm font-bold text-text hover:bg-card hover:border-primary/40 active:scale-95 transition-all shadow-xs min-h-[48px] flex items-center justify-center"
          >
            Preview Learn with AI
          </Link>
        </div>

        {/* Dual Portal Cards using SpotlightCard */}
        <div className="mt-14 w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {/* Learner Portal Card */}
          <Link href={routes.login} className="block group">
            <SpotlightCard className="h-full bg-card/90 hover:border-primary/50">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <GraduationCap className="size-5" />
                </span>
                <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Enter Portal <ArrowRight className="size-3.5" />
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-text group-hover:text-primary transition-colors">
                Learner Experience
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-text-muted leading-relaxed">
                Explore subject graphs, interact on the multi-modal whiteboard, chat with your AI mentor, and track your validated concept mastery.
              </p>
            </SpotlightCard>
          </Link>

          {/* Admin Portal Card */}
          <Link href={`${routes.login}?role=admin`} className="block group">
            <SpotlightCard className="h-full bg-card/90 hover:border-secondary/50">
              <div className="flex items-center justify-between mb-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary group-hover:scale-110 transition-transform">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="text-xs font-semibold text-secondary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Administrator Console <ArrowRight className="size-3.5" />
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-text group-hover:text-secondary transition-colors">
                Platform Governance &amp; Curricula
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-text-muted leading-relaxed">
                Ingest academic RAG textbooks, configure subject topic trees, inspect learner engagement telemetry, and oversee educational accuracy.
              </p>
            </SpotlightCard>
          </Link>
        </div>

        {/* Feature Grid using SpotlightCard */}
        <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <SpotlightCard className="bg-card/85 hover:border-primary/40">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Compass className="size-4.5" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-base font-bold text-text">Explore subjects</h3>
            <p className="mt-1 text-xs sm:text-sm text-text-muted leading-relaxed">
              Tailor lesson pacing and multi-sensory formats to your individual learning preferences: visual, auditory, read/write, or kinesthetic.
            </p>
          </SpotlightCard>

          <SpotlightCard className="bg-card/85 hover:border-primary/40">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Layers className="size-4.5" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-base font-bold text-text">Learn with AI</h3>
            <p className="mt-1 text-xs sm:text-sm text-text-muted leading-relaxed">
              Structured lesson chunks render seamlessly onto an interactive whiteboard while conversing with your adaptive AI tutor.
            </p>
          </SpotlightCard>

          <SpotlightCard className="bg-card/85 hover:border-primary/40">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <TrendingUp className="size-4.5" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-base font-bold text-text">Track growth</h3>
            <p className="mt-1 text-xs sm:text-sm text-text-muted leading-relaxed">
              Diagnostic checkpoints and mastery algorithms identify knowledge gaps and automatically recommend your optimal next step.
            </p>
          </SpotlightCard>
        </div>
      </main>

      {/* Responsive Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-card/40 backdrop-blur-sm py-6 px-4 sm:px-6 text-center text-xs text-text-muted">
        <p>&copy; {new Date().getFullYear()} {appConfig.name} &middot; Adaptive Personalized Learning Platform</p>
      </footer>
    </div>
  );
}
