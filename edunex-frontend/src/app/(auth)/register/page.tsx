"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  X,
  AlertTriangle,
} from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { authApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/lib/routes";
import { NexiMascot, type MascotState } from "@/components/auth/NexiMascot";

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
}

export default function RegisterPage() {
  const router = useRouter();
  const { learner, setAuthenticatedUser } = useLearner();
  const { showToast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>("idle");

  const nameId = useId();
  const emailId = useId();
  const passId = useId();
  const confirmPassId = useId();

  const {
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "learner",
    },
  });

  const currentName = watch("displayName");
  const currentEmail = watch("email");
  const currentPassword = watch("password");
  const currentConfirmPassword = watch("confirmPassword");
  const passwordStrength = calculatePasswordStrength(currentPassword || "");

  const nameReg = register("displayName");
  const emailReg = register("email");
  const passReg = register("password");
  const confirmPassReg = register("confirmPassword");

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const onSubmit = async (values: RegisterInput) => {
    setErrorMessage(null);
    setIsSuccess(false);
    setMascotState("authenticating");

    try {
      const result = await authApi.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });

      if (!result.ok) {
        setMascotState("error");
        setTimeout(() => setMascotState("idle"), 2400);

        if (result.error.kind === "conflict") {
          setErrorMessage("An account with this email address already exists. Please log in instead.");
        } else {
          setErrorMessage(result.error.message);
        }
        return;
      }

      setAuthenticatedUser(result.data);
      setIsSuccess(true);
      setMascotState("success");
      fireCelebration();

      showToast({
        variant: "success",
        title: "Account Created!",
        description: `Welcome to EduNex, ${values.displayName}! Setting up your workspace...`,
      });

      setTimeout(() => {
        router.push(routes.learner.dashboard);
      }, 900);
    } catch {
      setMascotState("error");
      setTimeout(() => setMascotState("idle"), 2400);
      setErrorMessage("Could not reach the EduNex server. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Animated Mascot */}
      <div className="pb-1">
        <NexiMascot
          state={mascotState}
          showPassword={showPassword || showConfirmPassword}
          role="learner"
        />
      </div>

      {/* Top Banner / Heading */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
          <Sparkles className="size-3.5" />
          <span>Start Your Learning Journey</span>
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-text xs:text-3xl">
          Create EduNex Account
        </h1>
        <p className="mt-1 text-xs text-text-muted xs:text-sm">
          Personalized, adaptive lessons tailored to your unique learning style
        </p>
      </div>

      {learner && (
        <div className="rounded-xl border border-border bg-card/80 p-3 text-xs text-text-muted">
          Active profile on this device: <span className="font-semibold text-text">{learner.displayName}</span> ({learner.email ?? "Guest profile"}).
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
            <p className="font-semibold text-error">Registration Error</p>
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
            <p className="font-semibold text-success">Profile initialized successfully!</p>
            <p className="text-xs text-text-muted">Directing you to your personalized learner dashboard...</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Display Name with Clear Button */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <User className="size-3.5 text-primary" />
            <span>Full Name or Preferred Nickname</span>
          </label>
          <div className="relative group">
            <input
              id={nameId}
              type="text"
              autoComplete="name"
              placeholder="e.g. Maya Lin"
              aria-invalid={Boolean(errors.displayName)}
              name={nameReg.name}
              ref={nameReg.ref}
              onChange={nameReg.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("email");
                }
              }}
              onBlur={(e) => {
                void nameReg.onBlur(e);
                if (mascotState === "email") {
                  setMascotState("idle");
                }
              }}
              className={`h-11 sm:h-12 w-full rounded-xl border bg-card pl-3.5 pr-9 text-base sm:text-sm text-text transition-all duration-200 placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-2 ${
                errors.displayName
                  ? "border-error focus-visible:ring-error"
                  : "border-border hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
              }`}
            />
            {currentName && (
              <button
                type="button"
                onClick={() => resetField("displayName")}
                aria-label="Clear name"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-full hover:bg-ivory transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {errors.displayName && (
            <p className="text-xs text-error animate-fade-scale" role="alert">
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Email with Clear Button */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Mail className="size-3.5 text-primary" />
            <span>Email Address</span>
          </label>
          <div className="relative group">
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@domain.com"
              aria-invalid={Boolean(errors.email)}
              name={emailReg.name}
              ref={emailReg.ref}
              onChange={emailReg.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("email");
                }
              }}
              onBlur={(e) => {
                void emailReg.onBlur(e);
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
                onClick={() => resetField("email")}
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

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={passId} className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Lock className="size-3.5 text-primary" />
            <span>Password (min. 8 characters)</span>
          </label>
          <div className="relative group">
            <input
              id={passId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              onKeyUp={handleKeyUp}
              onKeyDown={handleKeyUp}
              name={passReg.name}
              ref={passReg.ref}
              onChange={passReg.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("password");
                }
              }}
              onBlur={(e) => {
                void passReg.onBlur(e);
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
              onClick={() => setShowPassword((prev) => !prev)}
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
            <div className="mt-1 flex flex-col gap-1">
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
            </div>
          )}

          {errors.password && (
            <p className="text-xs text-error animate-fade-scale" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password with match status */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={confirmPassId} className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Confirm Password</span>
            </label>
            {currentPassword && currentConfirmPassword && (
              <span
                className={`text-[11px] font-semibold flex items-center gap-1 animate-fade-scale ${
                  currentPassword === currentConfirmPassword ? "text-success" : "text-error"
                }`}
              >
                {currentPassword === currentConfirmPassword ? (
                  <>
                    <CheckCircle2 className="size-3" /> Passwords match
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3" /> Mismatched
                  </>
                )}
              </span>
            )}
          </div>
          <div className="relative group">
            <input
              id={confirmPassId}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              name={confirmPassReg.name}
              ref={confirmPassReg.ref}
              onChange={confirmPassReg.onChange}
              onFocus={() => {
                if (mascotState !== "authenticating" && mascotState !== "success") {
                  setMascotState("password");
                }
              }}
              onBlur={(e) => {
                void confirmPassReg.onBlur(e);
                if (mascotState === "password") {
                  setMascotState("idle");
                }
              }}
              aria-invalid={Boolean(errors.confirmPassword)}
              className={`h-11 sm:h-12 w-full rounded-xl border bg-card pl-3.5 pr-11 text-base sm:text-sm text-text transition-all duration-200 placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-2 ${
                errors.confirmPassword
                  ? "border-error focus-visible:ring-error"
                  : "border-border hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text focus:outline-none transition-colors rounded-md"
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-error animate-fade-scale" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="size-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Creating your profile...</span>
            </span>
          ) : isSuccess ? (
            <span className="flex items-center gap-2 animate-badge-pop">
              <CheckCircle2 className="size-4" />
              <span>Redirecting...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <GraduationCap className="size-4" />
              <span>Create Account &amp; Start Learning</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center text-xs text-text-muted border-t border-border/80">
        <p>
          Already have an account?{" "}
          <Link
            href={routes.login}
            className="font-bold text-primary hover:underline hover:text-primary-hover inline-block p-1"
          >
            Sign in to your portal
          </Link>
        </p>
      </div>
    </div>
  );
}
