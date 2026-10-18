import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { appConfig } from "@/config/app";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { Card3D } from "@/components/auth/Card3D";
import { ThemeSelector } from "@/components/ui/ThemeSelector";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ivory safe-paddings px-3.5 sm:px-6 md:px-8 py-6 sm:py-10">
      {/* Dynamic Animated Aurora Mesh, Tech Grid & Interactive Particles */}
      <AnimatedBackground variant="portal" />

      {/* Top right theme selector */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeSelector variant="compact" />
      </div>

      {/* Brand Header with micro-interaction */}
      <header className="relative z-10 mb-4 sm:mb-6 flex flex-col items-center gap-1.5 text-center">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-full border border-border/80 bg-card/80 px-4 py-2 backdrop-blur-md shadow-xs transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-md hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs transition-transform duration-300 group-hover:rotate-6">
            <GraduationCap className="size-4.5" aria-hidden="true" />
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-text">
            {appConfig.name}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
            Portal
          </span>
        </Link>
      </header>

      {/* Main 3D Tilt Container */}
      <div className="relative z-10 w-full max-w-[96vw] xs:max-w-md sm:max-w-lg md:max-w-xl animate-fade-scale">
        <Card3D>
          {children}
        </Card3D>
      </div>

      {/* Footer reassurance */}
      <footer className="relative z-10 mt-5 sm:mt-7 text-center text-xs text-text-muted px-4">
        <p className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
          <span>Protected by EduNex adaptive role security</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Privacy &amp; learning integrity guaranteed</span>
        </p>
      </footer>
    </div>
  );
}
