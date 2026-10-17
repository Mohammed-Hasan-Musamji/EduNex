
import Link from "next/link";
import ParticleTrails from "@/components/landing/ParticleTrails";
import {
  ArrowDownRight,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Heart,
  Lightbulb,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { appConfig } from "@/config/app";
import { routes } from "@/lib/routes";

type FeatureTone = "peach" | "lavender" | "mint";

const features: {
  icon: typeof Brain;
  number: string;
  title: string;
  description: string;
  tone: FeatureTone;
}[] = [
  
  {
    icon: Brain,
    number: "01",
    title: "Learning that adapts",
    description:
      "Discover what you already know, identify skill gaps, and follow a learning path built around your needs.",
    tone: "peach",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Your AI study partner",
    description:
      "Explore concepts, ask questions, and work through ideas with an interactive lesson workspace.",
    tone: "lavender",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "See your growth",
    description:
      "Turn your learning activity into meaningful progress, stronger skills, and milestones worth celebrating.",
    tone: "mint",
  },
];

const toneClasses = {
  peach: "bg-orange-100 text-orange-700",
  lavender: "bg-purple-100 text-purple-700",
  mint: "bg-emerald-100 text-emerald-700",
} as const;



export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-ivory">
      {/* Navigation */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label={`${appConfig.name} home`}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-text sm:text-2xl">
            {appConfig.name}
            <span className="text-primary">.</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href={routes.login}
            className="interactive-lift rounded-xl px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:text-primary sm:px-5"
          >
            Sign in
          </Link>

          <Link
            href={routes.register}
            className="primary-glow inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white sm:px-5"
          >
            <span>Get started</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate">
          <ParticleTrails />
<div
            className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[660px] opacity-60"
            aria-hidden="true"
          />

          <div
            className="ambient-orb ambient-orb-one -left-24 top-28 -z-10 size-64 bg-orange-200/35 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="ambient-orb ambient-orb-two -right-20 top-20 -z-10 size-72 bg-purple-200/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="ambient-orb ambient-orb-three right-1/3 top-96 -z-10 size-48 bg-amber-200/25 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.03fr_0.97fr] lg:gap-12 lg:px-12 lg:pb-28 lg:pt-24">
            {/* Hero copy */}
            <div className="relative z-10 max-w-2xl">
              <div className="hero-enter inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/85 px-4 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm sm:text-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                AI-powered personalized learning
                <Sparkles className="size-4" aria-hidden="true" />
              </div>

              <h1 className="hero-enter hero-enter-delay-1 mt-7 max-w-2xl font-serif text-5xl font-bold leading-[1.08] tracking-[-0.045em] text-text sm:text-6xl lg:text-7xl">
                Your potential is bigger than{" "}
                <span className="text-gradient italic">you think.</span>
              </h1>

              <p className="hero-enter hero-enter-delay-2 mt-6 max-w-xl text-base leading-8 text-text-muted sm:text-lg">
                {appConfig.tagline} Discover your strengths, close your
                knowledge gaps, and build skills one rewarding step at a time.
              </p>

              <div className="hero-enter hero-enter-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={routes.register}
                  className="primary-glow group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-primary px-7 py-4 text-base font-semibold text-white"
                >
                  Start your learning journey
                  <ArrowRight
                    className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  href={routes.learner.learn}
                  className="interactive-lift inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-border bg-white/80 px-6 py-4 text-base font-semibold text-text shadow-sm backdrop-blur-sm hover:border-primary/30 hover:bg-white"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Play className="ml-0.5 size-3.5 fill-current" aria-hidden="true" />
                  </span>
                  Explore AI learning
                </Link>
              </div>

              <div className="hero-enter hero-enter-delay-4 mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-text-muted">
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-success" aria-hidden="true" />
                  Personalized learning paths
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-success" aria-hidden="true" />
                  Learn at your own pace
                </span>
              </div>

              <div className="mt-12 flex items-center gap-4 border-t border-border/80 pt-6">
                <div className="flex -space-x-2">
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-ivory bg-orange-100 text-sm">
                    🎯
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-ivory bg-purple-100 text-sm">
                    🧠
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-ivory bg-emerald-100 text-sm">
                    🚀
                  </span>
                </div>
                <p className="text-sm leading-6 text-text-muted">
                  <span className="font-semibold text-text">
                    Your goals. Your pace.
                  </span>
                  <br />
                  A smarter way to keep moving forward.
                </p>
              </div>
            </div>

            {/* Decorative product preview */}
            <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
              <div
                className="ambient-orb ambient-orb-one left-1/4 top-1/4 -z-10 size-64 bg-orange-200/50 blur-3xl"
                aria-hidden="true"
              />

              <div className="soft-float relative rounded-[2rem] border border-white/90 bg-white/65 p-3 shadow-[0_30px_100px_-35px_rgba(110,67,45,0.25)] backdrop-blur-xl sm:p-5">
                <div className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-white">
                  {/* Preview top bar */}
                  <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-text">
                          Your learning space
                        </p>
                        <p className="text-xs text-text-muted">
                          A little progress every day
                        </p>
                      </div>
                    </div>
                    <span className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <Heart className="size-4" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    {/* Welcome panel */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#bd6548] via-[#c97a54] to-[#d99c66] p-5 text-white sm:p-6">
                      <div
                        className="absolute -right-6 -top-8 size-36 rounded-full border border-white/15"
                        aria-hidden="true"
                      />
                      <div
                        className="absolute -right-1 top-4 size-24 rounded-full border border-white/20"
                        aria-hidden="true"
                      />

                      <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        YOUR NEXT CHAPTER
                      </span>

                      <h2 className="relative mt-4 max-w-xs font-serif text-2xl font-bold leading-tight sm:text-3xl">
                        Small steps. Big breakthroughs.
                      </h2>

                      <p className="relative mt-2 max-w-xs text-sm leading-6 text-white/85">
                        Every concept you master takes you one step further.
                      </p>

                      <div className="relative mt-5 flex items-center gap-2 text-sm font-semibold">
                        <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
                          <ArrowDownRight className="size-4" aria-hidden="true" />
                        </span>
                        Find your next step
                      </div>
                    </div>

                    {/* Skill preview */}
                    <div>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-text">
                            Your learning roadmap
                          </h3>
                          <p className="mt-1 text-xs text-text-muted">
                            An example of personalized learning
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Skill journey
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium text-text">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <Check className="size-4" aria-hidden="true" />
                              </span>
                              Foundations
                            </span>
                            <span className="font-semibold text-emerald-700">
                              Strong
                            </span>
                          </div>
                          <div className="progress-track h-2">
                            <div
                              className="progress-fill w-[88%] bg-emerald-500"
                              style={{ animationDelay: "150ms" }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium text-text">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                <Target className="size-4" aria-hidden="true" />
                              </span>
                              Applied practice
                            </span>
                            <span className="font-semibold text-amber-700">
                              Developing
                            </span>
                          </div>
                          <div className="progress-track h-2">
                            <div
                              className="progress-fill w-[56%] bg-amber-400"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium text-text">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                                <Lightbulb className="size-4" aria-hidden="true" />
                              </span>
                              Advanced concepts
                            </span>
                            <span className="font-semibold text-purple-700">
                              Next up
                            </span>
                          </div>
                          <div className="progress-track h-2">
                            <div
                              className="progress-fill w-[24%] bg-purple-400"
                              style={{ animationDelay: "450ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Motivation strip */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-[#fcf9f5] p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                          <Flame className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-text">
                            Build your rhythm
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            Every session is a fresh opportunity
                          </p>
                        </div>
                      </div>
                      <Zap className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating achievement card */}
              <div className="soft-float-delay glass-panel absolute -left-3 top-[20%] hidden rounded-2xl p-3.5 sm:block md:-left-10">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Trophy className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-text">
                      Every win counts
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Celebrate your progress
                    </p>
                  </div>
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                </div>
              </div>

              {/* Floating focus card */}
              <div className="soft-float glass-panel absolute -right-2 bottom-[17%] hidden rounded-2xl p-3.5 sm:block md:-right-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                    <Brain className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-text">
                      Learn your way
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Your goals, your roadmap
                    </p>
                  </div>
                  <Sparkles className="size-4 text-purple-500" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-muted">
                <span className="size-1.5 rounded-full bg-primary" />
                <span>Illustrative preview · Not live learner data</span>
              </div>
            </div>
          </div>
        </section>

        {/* Value proposition */}
        <section className="relative border-y border-border/70 bg-white/65 py-7 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 sm:px-8 lg:justify-between lg:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
              Learning, made personal
            </p>
            {[
              { icon: Target, text: "Find your skill gaps" },
              { icon: Brain, text: "Understand concepts" },
              { icon: TrendingUp, text: "Measure your growth" },
              { icon: Heart, text: "Enjoy the journey" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2.5 text-sm font-medium text-text"
              >
                <Icon
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                {text}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              A better way to learn
            </span>

            <h2 className="mt-5 font-serif text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl lg:text-5xl">
              Learning should feel like{" "}
              <span className="text-gradient italic">moving forward.</span>
            </h2>

            <p className="mt-5 text-base leading-7 text-text-muted sm:text-lg">
              Less guessing what to study next. More clarity, curiosity, and
              meaningful progress with every session.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16">
            {features.map(({ icon: Icon, number, title, description, tone }) => {

              return (
                <article
                  key={number}
                  className="premium-card group relative overflow-hidden p-6 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-14 items-center justify-center rounded-2xl ${toneClasses[tone]} transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-110`}
                    >
                      <Icon className="size-7" aria-hidden="true" />
                    </span>
                    <span className="font-serif text-4xl font-bold text-border transition-colors group-hover:text-primary/30">
                      {number}
                    </span>
                  </div>

                  <h3 className="mt-7 font-serif text-xl font-bold text-text sm:text-2xl">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-text-muted sm:text-base">
                    {description}
                  </p>

                  <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-primary">
                    Built around you
                    <ChevronRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className="absolute -bottom-12 -right-12 size-32 rounded-full bg-primary/[0.035] transition-transform duration-500 group-hover:scale-150"
                    aria-hidden="true"
                  />
                </article>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#30271f] px-6 py-12 text-center sm:px-12 sm:py-16 lg:py-20">
            <div
              className="ambient-orb ambient-orb-one -right-12 -top-28 size-72 bg-primary/30 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="ambient-orb ambient-orb-two -bottom-36 -left-10 size-80 bg-purple-500/20 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-orange-100">
                <Sparkles className="size-4" aria-hidden="true" />
                Your next breakthrough starts here
              </span>

              <h2 className="mt-6 font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                You don&apos;t have to know everything.
                <span className="mt-2 block text-[#f0b38b]">
                  Just take the next step.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                Start with what you know, discover what you can improve, and
                build your own path to mastery.
              </p>

              <Link
                href={routes.register}
                className="primary-glow group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 text-sm font-bold text-[#30271f] hover:bg-orange-50 sm:text-base"
              >
                Begin your journey
                <ArrowRight
                  className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" aria-hidden="true" />
            <span className="font-serif font-bold text-text">
              {appConfig.name}
            </span>
          </Link>

          <p className="text-sm text-text-muted">
            Make progress your own. One step at a time.
          </p>

          <div className="flex items-center gap-4 text-sm font-medium text-text-muted">
            <Link
              href={routes.login}
              className="transition-colors hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              href={routes.register}
              className="transition-colors hover:text-primary"
            >
              Join EduNex
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
