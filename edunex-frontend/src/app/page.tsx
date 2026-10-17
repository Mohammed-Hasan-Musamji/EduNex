import Link from "next/link";
import { GraduationCap, Sparkles, Compass, TrendingUp } from "lucide-react";
import { appConfig } from "@/config/app";
import { routes } from "@/lib/routes";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-white">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-semibold text-text">{appConfig.name}</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href={routes.login} className="rounded-md px-4 py-2 text-sm font-medium text-text hover:bg-white">
            Sign in
          </Link>
          <Link
            href={routes.register}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-20 text-center">
        <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-muted">
          AI-powered personalized learning
        </span>
        <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight text-text sm:text-5xl">
          {appConfig.tagline}
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
          EduNex adapts every lesson to your goals, preferences, and demonstrated understanding —
          then learns with you through an AI workspace built around a real-time whiteboard and chat.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={routes.register}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Start learning for free
          </Link>
          <Link
            href={routes.learner.learn}
            className="rounded-md border border-border bg-white px-6 py-3 text-sm font-medium text-text hover:bg-ivory"
          >
            Preview Learn with AI
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-white p-5">
            <Compass className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-serif text-base font-medium text-text">Explore subjects</p>
            <p className="mt-1 text-sm text-text-muted">
              Pick a topic and tell us how you learn best — visual, auditory, read/write, or kinesthetic.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-serif text-base font-medium text-text">Learn with AI</p>
            <p className="mt-1 text-sm text-text-muted">
              A structured lesson renders on an interactive whiteboard while you chat with your tutor.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <TrendingUp className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-serif text-base font-medium text-text">Track growth</p>
            <p className="mt-1 text-sm text-text-muted">
              Assessments and mastery tracking recommend your next best step.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
