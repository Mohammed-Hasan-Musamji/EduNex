"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, ClipboardCheck, Compass, Sparkles } from "lucide-react";
import { VarkPreferenceSelector } from "@/components/learner/VarkPreferenceSelector";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useLearner } from "@/hooks/use-learner";
import { learnerApi } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { VarkPreference } from "@/types/learner";

const STEPS = ["Welcome", "Preferences", "Starting point"];

export default function OnboardingPage() {
  const { learner, refresh } = useLearner();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [vark, setVark] = useState<VarkPreference[]>([]);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) return;
    // Resume where the learner left off: preferences already saved -> last step.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVark(learner.preferences.varkPreferences);
    setGoal(learner.preferences.learningGoal ?? "");
    const hasPrefs = learner.preferences.varkPreferences.length > 0 || Boolean(learner.preferences.learningGoal);
    if (learner.onboardingStatus === "in_progress" && hasPrefs) setStep(2);
  }, [learner]);

  if (!learner) return null;
  const firstName = learner.displayName.split(" ")[0];

  const begin = async () => {
    if (learner.onboardingStatus === "not_started" || learner.onboardingStatus === "skipped") {
      await learnerApi.updateOnboarding(learner.id, "in_progress");
    }
    setStep(1);
  };

  const savePreferences = async () => {
    setBusy(true);
    setError(null);
    const res = await learnerApi.updatePreferences(learner.id, { ...learner.preferences, varkPreferences: vark, learningGoal: goal.trim() || null });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    await refresh();
    setStep(2);
  };

  const skip = async () => {
    await learnerApi.updateOnboarding(learner.id, "skipped");
    await refresh();
    router.push(routes.learner.dashboard);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-2" aria-label="Onboarding progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-accent text-white" : i === step ? "bg-primary text-white" : "bg-surface-3 text-text-subtle",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span className={cn("hidden text-xs font-medium sm:inline", i === step ? "text-text" : "text-text-subtle")}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <section key={step} className="animate-enter rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <>
            <p className="text-sm font-medium text-primary">Welcome, {firstName}</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-text sm:text-3xl">Let&apos;s set up your learning</h1>
            <p className="mt-3 text-text-muted">EduNex helps you find your gaps and close them, using your course textbooks:</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
              {[
                [ClipboardCheck, "A short adaptive diagnostic finds where to start."],
                [Sparkles, "Lessons and practice are tailored to what you need next."],
                [BookOpenText, "Ask questions and get answers cited to the textbook page."],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Sparkles;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <I className="size-4" aria-hidden="true" />
                    </span>
                    <span className="pt-1.5 text-text">{text as string}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => void begin()}>
                Get started <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={() => void skip()}>
                Skip for now
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-serif text-2xl font-semibold text-text">How do you like things explained?</h1>
            <p className="mt-2 text-sm text-text-muted">
              Optional. Leave everything unselected for a balanced mix, or{" "}
              <Link href={routes.learner.preferences} className="font-medium text-primary hover:underline">
                take the 2-minute questionnaire
              </Link>{" "}
              instead.
            </p>
            <div className="mt-5 flex flex-col gap-5">
              <VarkPreferenceSelector value={vark} onChange={setVark} />
              <Textarea
                label="What are you working toward? (optional)"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="e.g. Pass my Data Structures midterm"
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => void savePreferences()} isLoading={busy}>
                Continue <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-serif text-2xl font-semibold text-text">Find your starting point</h1>
            <p className="mt-2 text-sm text-text-muted">
              Answer up to 8 questions in a subject. Questions adapt to your answers, and the results recommend where to begin.
              You can leave and resume at any time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={routes.learner.diagnostic} className={buttonClasses("primary", "lg")}>
                Choose a subject <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href={routes.learner.subjects} className={buttonClasses("secondary", "lg")}>
                <Compass className="size-4" aria-hidden="true" /> Just explore
              </Link>
              <Button variant="ghost" onClick={() => void skip()}>
                Do this later
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
