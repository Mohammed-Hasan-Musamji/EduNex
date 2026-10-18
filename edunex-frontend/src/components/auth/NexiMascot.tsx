"use client";

import { useEffect, useState } from "react";
import { playMascotChirp } from "@/lib/audio-effects";

export type MascotState = "idle" | "email" | "password" | "authenticating" | "success" | "error";

interface NexiMascotProps {
  state: MascotState;
  showPassword?: boolean;
  role?: "learner" | "admin";
}

const EASTER_EGG_QUOTES = [
  "I love data structures! 🦉",
  "Pointers connect our world! 🔗",
  "Ready to crush your goals! 🚀",
  "Psst: 1-Click demo accounts below! ⚡",
  "Adaptive AI tutor on duty! 💡",
  "You've got this! ✨",
];

export function NexiMascot({ state, showPassword = false, role = "learner" }: NexiMascotProps) {
  const [blink, setBlink] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [easterEggQuote, setEasterEggQuote] = useState<string | null>(null);

  // Periodic blinking in idle & email states
  useEffect(() => {
    if (state === "password" || state === "authenticating") return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3800);
    return () => clearInterval(interval);
  }, [state]);

  const handleMascotClick = () => {
    playMascotChirp();
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 650);
    const randomQuote = EASTER_EGG_QUOTES[Math.floor(Math.random() * EASTER_EGG_QUOTES.length)];
    setEasterEggQuote(randomQuote);
    setTimeout(() => setEasterEggQuote(null), 3200);
  };

  const isCoveringEyes = state === "password" && !showPassword;
  const isPeeking = state === "password" && showPassword;
  const isSuccess = state === "success";
  const isError = state === "error";
  const isAuthenticating = state === "authenticating";

  // Role accents
  const primaryColor = role === "admin" ? "#8c4832" : "#b96f52";
  const accentColor = role === "admin" ? "#d9a441" : "#d9a441";
  const glowShadow = role === "admin" ? "rgba(140, 72, 50, 0.3)" : "rgba(185, 111, 82, 0.3)";

  return (
    <div
      onClick={handleMascotClick}
      role="button"
      tabIndex={0}
      title="Click Nexi for learning inspiration!"
      className={`relative mx-auto flex flex-col items-center select-none cursor-pointer group transition-all duration-300 ${
        isSpinning
          ? "rotate-[360deg] scale-110"
          : isSuccess
          ? "animate-bounce"
          : isError
          ? "animate-shake"
          : "hover:scale-105"
      }`}
      style={{ filter: `drop-shadow(0 10px 20px ${glowShadow})` }}
    >
      <svg
        width="110"
        height="110"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="bodyGrad" x1="20" y1="20" x2="100" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#f4ede4" />
          </linearGradient>

          <linearGradient id="accentGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor={primaryColor} />
            <stop offset="1" stopColor={accentColor} />
          </linearGradient>

          <linearGradient id="visorGrad" x1="30" y1="40" x2="90" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#292824" />
            <stop offset="1" stopColor="#1a1917" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating Aura */}
        <ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(41, 40, 36, 0.08)" />

        {/* Ear / Antennas */}
        <path
          d="M32 38L22 24C21 22 24 20 26 22L38 32"
          stroke={primaryColor}
          strokeWidth="4"
          strokeLinecap="round"
          className="transition-transform duration-300 origin-bottom"
          style={{ transform: state === "email" ? "rotate(-4deg)" : "none" }}
        />
        <circle cx="22" cy="22" r="4" fill={accentColor} />

        <path
          d="M88 38L98 24C99 22 96 20 94 22L82 32"
          stroke={primaryColor}
          strokeWidth="4"
          strokeLinecap="round"
          className="transition-transform duration-300 origin-bottom"
          style={{ transform: state === "email" ? "rotate(4deg)" : "none" }}
        />
        <circle cx="98" cy="22" r="4" fill={accentColor} />

        {/* Main Body */}
        <rect
          x="24"
          y="28"
          width="72"
          height="76"
          rx="36"
          fill="url(#bodyGrad)"
          stroke="#e8e0d6"
          strokeWidth="3"
        />

        {/* Graduation Cap / Academic Crest */}
        {role === "learner" ? (
          <g className="transition-transform duration-300" style={{ transformOrigin: "60px 24px" }}>
            {/* Mortarboard */}
            <polygon points="60,8 96,20 60,32 24,20" fill={primaryColor} />
            <polygon points="60,11 92,20 60,29 28,20" fill="url(#accentGrad)" opacity="0.9" />
            <rect x="58" y="27" width="4" height="4" fill="#ffffff" />
            {/* Tassel */}
            <path d="M60 20 C64 22, 70 24, 76 28 L78 36" stroke={accentColor} strokeWidth="2.5" fill="none" />
            <circle cx="78" cy="37" r="2.5" fill={accentColor} />
          </g>
        ) : (
          /* Admin Shield Crown */
          <g className="transition-transform duration-300" style={{ transformOrigin: "60px 20px" }}>
            <path
              d="M60 10 L75 16 C75 26 60 32 60 32 C60 32 45 26 45 16 Z"
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle cx="60" cy="20" r="3" fill={accentColor} />
          </g>
        )}

        {/* Visor Screen Face */}
        <rect x="34" y="44" width="52" height="36" rx="14" fill="url(#visorGrad)" />

        {/* Cheeks Blush (Active when happy or peeking) */}
        {(isSuccess || isPeeking || state === "idle") && (
          <>
            <circle cx="40" cy="72" r="3.5" fill="rgba(235, 110, 110, 0.45)" />
            <circle cx="80" cy="72" r="3.5" fill="rgba(235, 110, 110, 0.45)" />
          </>
        )}

        {/* Eyes & Expressions */}
        {isAuthenticating ? (
          /* Thinking / Spin Eyes */
          <g fill={accentColor} className="animate-spin origin-center" style={{ transformOrigin: "60px 62px" }}>
            <circle cx="48" cy="62" r="3" />
            <circle cx="72" cy="62" r="3" />
            <circle cx="60" cy="54" r="2" />
            <circle cx="60" cy="70" r="2" />
          </g>
        ) : isSuccess ? (
          /* Happy Joy Eyes ^_^ */
          <g stroke={accentColor} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M43 64 Q48 56 53 64" />
            <path d="M67 64 Q72 56 77 64" />
            {/* Big Smile */}
            <path d="M54 71 Q60 77 66 71" stroke="#ffffff" strokeWidth="2" />
          </g>
        ) : isError ? (
          /* Error Eyes >_< */
          <g stroke="#e5534b" strokeWidth="3" strokeLinecap="round">
            <line x1="44" y1="58" x2="52" y2="66" />
            <line x1="52" y1="58" x2="44" y2="66" />
            <line x1="68" y1="58" x2="76" y2="66" />
            <line x1="76" y1="58" x2="68" y2="66" />
            <path d="M55 73 Q60 69 65 73" stroke="#e5534b" strokeWidth="2" fill="none" />
          </g>
        ) : isCoveringEyes ? (
          /* Eyes Covered Under Hands (Blindfold line) */
          <g stroke="#77736c" strokeWidth="2" strokeLinecap="round">
            <line x1="43" y1="62" x2="53" y2="62" />
            <line x1="67" y1="62" x2="77" y2="62" />
          </g>
        ) : isPeeking ? (
          /* Peeking eyes (one eye peeking playfully!) */
          <g fill={accentColor}>
            <circle cx="48" cy="60" r="4.5" />
            <circle cx="50" cy="58" r="1.5" fill="#ffffff" />
            {/* Other eye wink */}
            <path d="M68 62 Q72 65 76 62" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        ) : blink ? (
          /* Blinking closed line */
          <g stroke={accentColor} strokeWidth="2.5" strokeLinecap="round">
            <line x1="44" y1="62" x2="52" y2="62" />
            <line x1="68" y1="62" x2="76" y2="62" />
          </g>
        ) : state === "email" ? (
          /* Pupils looking down towards form */
          <g fill={accentColor}>
            <ellipse cx="48" cy="65" rx="4.5" ry="5" />
            <ellipse cx="72" cy="65" rx="4.5" ry="5" />
            <circle cx="50" cy="63" r="1.5" fill="#ffffff" />
            <circle cx="74" cy="63" r="1.5" fill="#ffffff" />
            {/* Curious subtle smile */}
            <path d="M56 71 Q60 74 64 71" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          /* Default Alert Eyes */
          <g fill={accentColor}>
            <circle cx="48" cy="61" r="5" />
            <circle cx="72" cy="61" r="5" />
            <circle cx="50" cy="59" r="1.8" fill="#ffffff" />
            <circle cx="74" cy="59" r="1.8" fill="#ffffff" />
            {/* Friendly small mouth */}
            <path d="M57 71 Q60 73 63 71" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Paws / Hands */}
        {/* Left Paw */}
        <g
          className="transition-all duration-300"
          style={{
            transform: isCoveringEyes
              ? "translate(16px, -14px)"
              : isPeeking
              ? "translate(14px, -8px)"
              : "translate(0px, 0px)",
            transformOrigin: "26px 86px",
          }}
        >
          <ellipse cx="26" cy="86" rx="8" ry="12" fill="url(#bodyGrad)" stroke="#e8e0d6" strokeWidth="2" />
          {/* Paw pads */}
          <circle cx="26" cy="84" r="3" fill={primaryColor} opacity="0.3" />
        </g>

        {/* Right Paw */}
        <g
          className="transition-all duration-300"
          style={{
            transform: isCoveringEyes
              ? "translate(-16px, -14px)"
              : isPeeking
              ? "translate(-12px, 0px)"
              : "translate(0px, 0px)",
            transformOrigin: "94px 86px",
          }}
        >
          <ellipse cx="94" cy="86" rx="8" ry="12" fill="url(#bodyGrad)" stroke="#e8e0d6" strokeWidth="2" />
          {/* Paw pads */}
          <circle cx="94" cy="84" r="3" fill={primaryColor} opacity="0.3" />
        </g>

        {/* Sparkle badge on chest */}
        <circle cx="60" cy="94" r="4" fill={accentColor} opacity="0.9" />
      </svg>

      {/* Dynamic Status Speech Bubble */}
      <div
        className={`mt-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wide transition-all duration-300 ${
          easterEggQuote
            ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md animate-badge-pop"
            : isCoveringEyes
            ? "bg-text text-white shadow-xs"
            : isPeeking
            ? "bg-secondary text-white shadow-xs animate-badge-pop"
            : isSuccess
            ? "bg-success text-white shadow-xs animate-badge-pop"
            : isError
            ? "bg-error text-white shadow-xs"
            : isAuthenticating
            ? "bg-primary text-white shadow-xs animate-pulse"
            : state === "email"
            ? "bg-primary/10 text-primary"
            : "bg-card/90 text-text border border-border/80 hover:border-primary/40 shadow-xs"
        }`}
      >
        {easterEggQuote ? (
          easterEggQuote
        ) : (
          <>
            {isCoveringEyes && "🙈 Privacy mode: I won't peek!"}
            {isPeeking && "👀 Peeking allowed!"}
            {isSuccess && "🎉 Welcome aboard!"}
            {isError && "🤔 Let's try again!"}
            {isAuthenticating && "✨ Verifying neural key..."}
            {state === "email" && "Ready to learn!"}
            {state === "idle" && (role === "admin" ? "🛡️ System Shield Active" : "🌟 Click me for tips!")}
          </>
        )}
      </div>
    </div>
  );
}
