"use client";

<<<<<<< HEAD
import { Suspense, useState, useId, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  KeyRound,
  Zap,
  Check,
  X,
  AlertTriangle,
  Volume2,
  VolumeX,
  Layers,
  Award,
} from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { authApi } from "@/lib/api-client";
=======
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginInput } from "@/lib/schemas";
>>>>>>> b5abe61 (Implemented 3)
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/lib/routes";
import { NexiMascot, type MascotState } from "@/components/auth/NexiMascot";
import {
  playClickSound,
  playSwitchSound,
  playSuccessChime,
  getSoundEnabled,
  setSoundEnabled,
} from "@/lib/audio-effects";

type ActiveRole = "learner" | "admin";

const DEMO_CREDENTIALS = {
  learner: {
    name: "Alex Chen",
    email: "learner@edunex.com",
    password: "learnerpassword123",
    roleLabel: "Adaptive Learner",
    tagline: "VARK-tuned AI lessons & whiteboard",
  },
  admin: {
    name: "EduNex Administrator",
    email: "admin@edunex.com",
    password: "adminpassword123",
    roleLabel: "System Administrator",
    tagline: "Curricula, RAG docs & analytics",
  },
} as const;

const TEASERS = [
  {
    title: "Real-Time AI Whiteboard",
    desc: "Visual diagrams, tree traversals, and interactive code walkthroughs render as you chat.",
    icon: Sparkles,
  },
  {
    title: "Adaptive VARK Engine",
    desc: "Lessons re-structure automatically for Visual, Auditory, Read/Write, or Kinesthetic learning.",
    icon: Layers,
  },
  {
    title: "Validated Mastery Tracking",
    desc: "Formative assessments verify true algorithmic understanding before recommending next steps.",
    icon: Award,
  },
];

function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "bg-border" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 14) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "bg-error" };
    case 2:
      return { score: 2, label: "Fair", color: "bg-warning" };
    case 3:
      return { score: 3, label: "Good", color: "bg-primary" };
    case 4:
      return { score: 4, label: "Strong", color: "bg-success" };
    default:
      return { score: 1, label: "Too short", color: "bg-error" };
  }
}

function fireCelebration() {
  const count = 180;
  const defaults = {
    origin: { y: 0.65 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 30,
    startVelocity: 55,
    colors: ["#b96f52", "#d9a441", "#ffffff"],
  });
  fire(0.2, {
    spread: 60,
    colors: ["#b96f52", "#4f7a5b", "#d9a441"],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ["#ffffff", "#d9a441", "#b96f52"],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ["#e8f0e9", "#faf0dc", "#b96f52"],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ["#d9a441", "#8c4832"],
  });
}

function LoginFormContent() {
  const router = useRouter();
<<<<<<< HEAD
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role") as ActiveRole | null;

  const { learner, setAuthenticatedUser } = useLearner();
  const [activeRole, setActiveRole] = useState<ActiveRole>(
    requestedRole === "admin" ? "admin" : "learner"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [demoFillFeedback, setDemoFillFeedback] = useState<ActiveRole | null>(null);
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [activeTeaserIdx, setActiveTeaserIdx] = useState(0);

  const [showLegacyResume, setShowLegacyResume] = useState(false);
  const [legacyId, setLegacyId] = useState("");
  const [legacyLoading, setLegacyLoading] = useState(false);

  const emailInputId = useId();
  const passwordInputId = useId();

  // Restore audio preference
  useEffect(() => {
    setSoundEnabledState(getSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: activeRole,
    },
  });

  const currentEmail = watch("email");
  const currentPassword = watch("password");
  const passwordStrength = calculatePasswordStrength(currentPassword || "");

  // Password requirements calculation
  const hasMinLength = (currentPassword?.length ?? 0) >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(currentPassword || "") && /\d/.test(currentPassword || "");
  const hasSpecialOrUpper = /[A-Z]/.test(currentPassword || "") || /[^a-zA-Z0-9]/.test(currentPassword || "");
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail || "");

  const emailRegistration = register("email");
  const passwordRegistration = register("password");

  // Handle switching tabs with sound
  const handleRoleChange = (role: ActiveRole) => {
    playSwitchSound();
    setActiveRole(role);
    setValue("role", role);
    setErrorMessage(null);
  };

  // Quick-fill credentials helper
  const handleFillDemo = (role: ActiveRole, autoSubmit = false) => {
    playClickSound();
    const creds = DEMO_CREDENTIALS[role];
    handleRoleChange(role);
    setValue("email", creds.email, { shouldValidate: true });
    setValue("password", creds.password, { shouldValidate: true });
    setErrorMessage(null);
    setDemoFillFeedback(role);

    setTimeout(() => {
      setDemoFillFeedback(null);
    }, 2000);

    if (autoSubmit) {
      void onSubmit({
        email: creds.email,
        password: creds.password,
        role,
      });
    }
=======
  const { login } = useLearner();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    const result = await login(values);
    if (!result.ok) {
      setError("password", { message: result.message });
      return;
    }
    showToast({ variant: "success", title: "Signed in", description: "Welcome back!" });
    router.push(routes.learner.dashboard);
>>>>>>> b5abe61 (Implemented 3)
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const onSubmit = async (values: LoginInput) => {
    playClickSound();
    setErrorMessage(null);
    setIsSuccess(false);
    setMascotState("authenticating");

    try {
      const result = await authApi.login({
        email: values.email,
        password: values.password,
      });

      if (!result.ok) {
        setMascotState("error");
        setTimeout(() => setMascotState("idle"), 2400);

        if (result.error.kind === "unauthorized") {
          setErrorMessage("Invalid email or password. Please verify your credentials or click a Quick Test Account below.");
        } else {
          setErrorMessage(result.error.message);
        }
        return;
      }

      const user = result.data;
      setAuthenticatedUser(user);

      const targetRole = user.role ?? values.role;
      setIsSuccess(true);
      setMascotState("success");
      playSuccessChime();
      fireCelebration();

      setSuccessMessage(
        targetRole === "admin"
          ? `Welcome Administrator, ${user.displayName}!`
          : `Welcome back, ${user.displayName}!`
      );

      // Smooth transition before redirect
      setTimeout(() => {
        if (targetRole === "admin") {
          router.push(routes.admin.dashboard);
        } else {
          router.push(routes.learner.dashboard);
        }
      }, 900);
    } catch {
      setMascotState("error");
      setTimeout(() => setMascotState("idle"), 2400);
      setErrorMessage("Could not connect to EduNex server. Please verify your connection.");
    }
  };

  // Handle legacy UUID resume if requested
  const handleLegacyResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyId.trim()) return;
    playClickSound();
    setLegacyLoading(true);
    setErrorMessage(null);

    try {
      const { learnerApi } = await import("@/lib/api-client");
      const result = await learnerApi.get(legacyId.trim());
      if (!result.ok) {
        setErrorMessage(
          result.error.kind === "not_found"
            ? "No learner found with that ID."
            : result.error.message
        );
        setLegacyLoading(false);
        return;
      }
      setAuthenticatedUser(result.data);
      router.push(routes.learner.dashboard);
    } catch {
      setErrorMessage("Failed to resume profile.");
      setLegacyLoading(false);
    }
  };

  const CurrentTeaserIcon = TEASERS[activeTeaserIdx].icon;

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Top Controls: Sound Toggle */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success animate-pulse" />
          System Operational
        </span>
        <button
          type="button"
          onClick={handleToggleSound}
          className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-text-muted hover:text-text hover:bg-card hover:border-primary/40 transition-all shadow-xs"
          title={soundEnabled ? "Mute interactive audio feedback" : "Enable interactive audio feedback"}
          aria-label={soundEnabled ? "Mute audio" : "Enable audio"}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="size-3.5 text-primary" />
              <span>Sound ON</span>
            </>
          ) : (
            <>
              <VolumeX className="size-3.5 text-text-muted" />
              <span>Sound OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Mascot Avatar (Clickable Easter Egg) */}
      <div>
        <NexiMascot state={mascotState} showPassword={showPassword} role={activeRole} />
      </div>

      {/* Top Banner / Heading */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-text xs:text-3xl">
          Welcome to EduNex
        </h1>
        <p className="mt-1 text-xs text-text-muted xs:text-sm">
          Select your portal to continue your personalized learning journey
        </p>
      </div>

      {/* Interactive Role Switcher with Animated Sliding Highlight Pill */}
      <div
        className="relative rounded-xl border border-border/80 bg-ivory/80 p-1 sm:p-1.5 shadow-inner"
        role="tablist"
        aria-label="Portal Selection"
      >
        {/* Animated Sliding Background Indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm border border-border/60 transition-transform duration-300 ease-out ${
            activeRole === "learner"
              ? "left-1 translate-x-0"
              : "left-1 translate-x-[calc(100%+4px)]"
          }`}
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-2 gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => handleRoleChange("learner")}
            className={`group relative flex items-center justify-center gap-1.5 xs:gap-2 rounded-lg py-2.5 px-2 xs:px-3 text-xs xs:text-sm font-semibold transition-colors duration-200 min-h-[44px] ${
              activeRole === "learner"
                ? "text-primary"
                : "text-text-muted hover:text-text"
            }`}
            aria-selected={activeRole === "learner"}
            role="tab"
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                activeRole === "learner"
                  ? "bg-primary/10 text-primary"
                  : "bg-transparent text-text-muted group-hover:text-text"
              }`}
            >
              <GraduationCap className="size-4" />
            </span>
            <span className="truncate">Learner Portal</span>
            {activeRole === "learner" && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("admin")}
            className={`group relative flex items-center justify-center gap-1.5 xs:gap-2 rounded-lg py-2.5 px-2 xs:px-3 text-xs xs:text-sm font-semibold transition-colors duration-200 min-h-[44px] ${
              activeRole === "admin"
                ? "text-[#8c4832]"
                : "text-text-muted hover:text-text"
            }`}
            aria-selected={activeRole === "admin"}
            role="tab"
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                activeRole === "admin"
                  ? "bg-[#8c4832]/10 text-[#8c4832]"
                  : "bg-transparent text-text-muted group-hover:text-text"
              }`}
            >
              <ShieldCheck className="size-4" />
            </span>
            <span className="truncate">Admin Portal</span>
            {activeRole === "admin" && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8c4832]/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8c4832]"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Role Context Notification Pill */}
      <div
        className={`flex items-start gap-2.5 rounded-xl border p-3 sm:p-3.5 text-xs transition-all duration-300 ${
          activeRole === "learner"
            ? "border-primary/20 bg-primary/5 text-text"
            : "border-[#8c4832]/25 bg-[#8c4832]/5 text-text"
        }`}
      >
        {activeRole === "learner" ? (
          <>
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-primary">Personalized Learner Experience</p>
              <p className="mt-0.5 text-text-muted leading-relaxed">
                Interact with the AI Whiteboard, get instant concept explanations, and view demonstrated mastery tracking.
              </p>
            </div>
          </>
        ) : (
          <>
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8c4832]" />
            <div className="flex-1">
              <p className="font-semibold text-[#8c4832]">Administrator Console &amp; Curricula</p>
              <p className="mt-0.5 text-text-muted leading-relaxed">
                Ingest RAG documents, manage academic courses, inspect student progress analytics, and system settings.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Fast 1-Click Demo Fill Banner */}
      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3 sm:p-3.5 transition-all hover:border-secondary/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-secondary/20 text-secondary">
              <Zap className="size-3 sm:size-3.5" />
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text">
              1-Click Demo Account
            </span>
          </div>
          {demoFillFeedback === activeRole ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-success animate-badge-pop">
              <Check className="size-3" /> Credentials applied
            </span>
          ) : (
            <span className="text-[11px] font-medium text-text-muted">Instant test</span>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-card/95 p-2.5 sm:p-3 border border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text truncate">
              {DEMO_CREDENTIALS[activeRole].name}
              <span className="ml-1.5 font-normal text-text-muted text-[11px]">
                ({DEMO_CREDENTIALS[activeRole].email})
              </span>
            </p>
            <p className="text-[11px] text-text-muted truncate">
              {DEMO_CREDENTIALS[activeRole].tagline}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => handleFillDemo(activeRole, false)}
              className="flex-1 sm:flex-none rounded-md border border-border bg-ivory px-2.5 py-1.5 text-xs font-medium text-text hover:bg-card active:scale-95 transition-all text-center min-h-[36px] flex items-center justify-center"
            >
              Fill form
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo(activeRole, true)}
              disabled={isSubmitting || isSuccess}
              className="flex-1 sm:flex-none rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1 min-h-[36px]"
            >
              <span>Instant sign in</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Session Shortcut (if user is already logged in on device) */}
      {learner && (
        <div className="flex items-center justify-between rounded-xl border border-success/40 bg-card p-3 text-xs sm:text-sm shadow-xs animate-fade-scale">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
              <User className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-text truncate">
                Active: {learner.displayName}
              </p>
              <p className="text-[11px] text-text-muted capitalize">
                Role: {learner.role ?? "learner"}
              </p>
            </div>
          </div>
          <Link
            href={learner.role === "admin" ? routes.admin.dashboard : routes.learner.dashboard}
            className="rounded-lg bg-success px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-success/90 shadow-xs flex items-center gap-1.5 shrink-0 ml-2 min-h-[36px]"
          >
            <span>Resume</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Error Banner with Shake Animation */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-error/40 bg-card p-3.5 text-xs sm:text-sm shadow-xs animate-shake"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-error/15 text-error ring-1 ring-error/25">
            <AlertCircle className="size-4" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-error">Authentication Error</p>
            <p className="mt-0.5 text-xs text-text leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {isSuccess && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-success/40 bg-card p-3.5 text-xs sm:text-sm shadow-xs animate-fade-scale"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/25">
            <CheckCircle2 className="size-4.5" />
          </div>
          <div>
            <p className="font-semibold text-success">{successMessage}</p>
            <p className="text-xs text-text-muted">Launching your personalized workspace...</p>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Email Field with Live Validity Badge & Clear Button */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={emailInputId}
              className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5"
            >
              <Mail className="size-3.5 text-primary" />
              <span>Email Address</span>
            </label>
            {isValidEmailFormat && (
              <span className="text-[11px] font-semibold text-success flex items-center gap-1 animate-fade-scale">
                <Check className="size-3" /> Valid email
              </span>
            )}
          </div>
          <div className="relative group">
            <input
              id={emailInputId}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={activeRole === "admin" ? "admin@edunex.com" : "you@example.com"}
              aria-invalid={Boolean(errors.email)}
              name={emailRegistration.name}
              ref={emailRegistration.ref}
              onChange={emailRegistration.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("email");
                }
              }}
              onBlur={(e) => {
                void emailRegistration.onBlur(e);
                if (mascotState === "email") {
                  setMascotState("idle");
                }
              }}
              className={`h-11 sm:h-12 w-full rounded-xl border bg-card pl-3.5 pr-9 text-base sm:text-sm text-text transition-all duration-200 placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-2 ${
                errors.email
                  ? "border-error focus-visible:ring-error"
                  : "border-border hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
              }`}
            />
            {currentEmail && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  resetField("email");
                }}
                aria-label="Clear email"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-full hover:bg-ivory transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {errors.email && (
            <p className="text-xs text-error animate-fade-scale" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field with Checklist & CapsLock Detection */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={passwordInputId}
              className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5"
            >
              <Lock className="size-3.5 text-primary" />
              <span>Password</span>
            </label>
            <span className="text-[11px] text-text-muted hidden xs:inline">
              Demo: <code className="bg-ivory px-1 py-0.5 rounded text-primary">{activeRole}password123</code>
            </span>
          </div>
          <div className="relative group">
            <input
              id={passwordInputId}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              onKeyUp={handleKeyUp}
              onKeyDown={handleKeyUp}
              name={passwordRegistration.name}
              ref={passwordRegistration.ref}
              onChange={passwordRegistration.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("password");
                }
              }}
              onBlur={(e) => {
                void passwordRegistration.onBlur(e);
                if (mascotState === "password") {
                  setMascotState("idle");
                }
              }}
              aria-invalid={Boolean(errors.password)}
              className={`h-11 sm:h-12 w-full rounded-xl border bg-card pl-3.5 pr-11 text-base sm:text-sm text-text transition-all duration-200 placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-2 ${
                errors.password
                  ? "border-error focus-visible:ring-error"
                  : "border-border hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowPassword((prev) => !prev);
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text focus:outline-none transition-colors rounded-md"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* CapsLock Indicator */}
          {capsLockOn && (
            <div className="flex items-center gap-1.5 text-xs text-warning bg-warning-bg px-2.5 py-1 rounded-md animate-badge-pop">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="font-medium">Caps Lock is ON</span>
            </div>
          )}

          {/* Dynamic Password Strength Visualizer */}
          {currentPassword && (
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Password strength:</span>
                <span className="font-semibold text-text">{passwordStrength.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`rounded-full transition-all duration-300 ${
                      step <= passwordStrength.score ? passwordStrength.color : "bg-border/60"
                    }`}
                  />
                ))}
              </div>

              {/* Real-time Requirement Checklist Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-all duration-200 ${
                    hasMinLength
                      ? "bg-success/15 text-success font-semibold"
                      : "bg-ivory text-text-muted border border-border/60"
                  }`}
                >
                  <Check className={`size-3 ${hasMinLength ? "text-success" : "text-text-muted/40"}`} />
                  8+ chars
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-all duration-200 ${
                    hasLetterAndNumber
                      ? "bg-success/15 text-success font-semibold"
                      : "bg-ivory text-text-muted border border-border/60"
                  }`}
                >
                  <Check className={`size-3 ${hasLetterAndNumber ? "text-success" : "text-text-muted/40"}`} />
                  Letters &amp; digits
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-all duration-200 ${
                    hasSpecialOrUpper
                      ? "bg-success/15 text-success font-semibold"
                      : "bg-ivory text-text-muted border border-border/60"
                  }`}
                >
                  <Check className={`size-3 ${hasSpecialOrUpper ? "text-success" : "text-text-muted/40"}`} />
                  Upper or symbol
                </span>
              </div>
            </div>
          )}

          {errors.password && (
            <p className="text-xs text-error animate-fade-scale" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button with Dynamic Hover & Active Feedback */}
        <button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className={`relative mt-2 flex h-12 sm:h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 overflow-hidden group ${
            activeRole === "admin"
              ? "bg-[#8c4832] hover:bg-[#783c29] focus-visible:ring-[#8c4832]"
              : "bg-primary hover:bg-primary-hover focus-visible:ring-primary"
          } disabled:opacity-70 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="size-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Verifying credentials...</span>
            </span>
          ) : isSuccess ? (
            <span className="flex items-center gap-2 animate-badge-pop">
              <CheckCircle2 className="size-4" />
              <span>Redirecting...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {activeRole === "admin" ? (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Enter Administrator Console</span>
                </>
              ) : (
                <>
                  <GraduationCap className="size-4" />
                  <span>Continue to Learning Workspace</span>
                </>
              )}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          )}
        </button>
      </form>

      {/* Interactive Feature Teaser Drawer */}
      <div className="rounded-xl border border-border/70 bg-card/80 p-3 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Platform Capabilities
          </span>
          <div className="flex items-center gap-1">
            {TEASERS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTeaserIdx(idx);
                }}
                aria-label={`View ${TEASERS[idx].title}`}
                className={`size-2 rounded-full transition-all ${
                  activeTeaserIdx === idx ? "bg-primary w-4" : "bg-border hover:bg-text-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <div
          onClick={() => {
            playClickSound();
            setActiveTeaserIdx((prev) => (prev + 1) % TEASERS.length);
          }}
          className="flex items-start gap-2.5 cursor-pointer group p-1 rounded-lg hover:bg-ivory/60 transition-colors"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <CurrentTeaserIcon className="size-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors flex items-center justify-between">
              <span>{TEASERS[activeTeaserIdx].title}</span>
              <span className="text-[10px] text-text-muted font-normal">tap next &rarr;</span>
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
              {TEASERS[activeTeaserIdx].desc}
            </p>
          </div>
        </div>
      </div>

      {/* Alternative actions */}
      <div className="flex flex-col items-center gap-2.5 pt-1 text-center text-xs text-text-muted border-t border-border/80">
        <p>
          Don&apos;t have an account yet?{" "}
          <Link
            href={routes.register}
            onClick={() => playClickSound()}
            className="font-bold text-primary hover:underline hover:text-primary-hover inline-block p-1"
          >
            Create free learner account
          </Link>
        </p>

        {/* Collapsible Legacy UUID profile resume for backwards compatibility */}
        <div className="w-full pt-0.5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowLegacyResume((prev) => !prev);
            }}
            className="text-[11px] text-text-muted/80 hover:text-text transition-colors flex items-center justify-center gap-1 mx-auto min-h-[32px] p-1"
          >
            <KeyRound className="size-3 text-secondary" />
            <span>Have a legacy UUID from an older session?</span>
          </button>

          {showLegacyResume && (
            <form onSubmit={handleLegacyResume} className="mt-2.5 flex flex-col xs:flex-row gap-2 animate-fade-scale">
              <input
                type="text"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={legacyId}
                onChange={(e) => setLegacyId(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-border bg-card px-2.5 text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={legacyLoading || !legacyId.trim()}
                className="rounded-lg bg-secondary/90 px-4 py-2 text-xs font-semibold text-white hover:bg-secondary active:scale-95 disabled:opacity-50 transition-all min-h-[40px]"
              >
                {legacyLoading ? "Finding..." : "Resume"}
              </button>
            </form>
          )}
        </div>
      </div>
=======
    <div>
      <h1 className="font-serif text-2xl font-semibold text-text">Sign in</h1>
      <p className="mt-1 text-sm text-text-muted">Continue your learning journey.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Need an account?{" "}
        <Link href={routes.register} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
>>>>>>> b5abe61 (Implemented 3)
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm font-medium text-text">Loading EduNex Portal...</p>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
