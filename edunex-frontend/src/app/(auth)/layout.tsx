import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { appConfig } from "@/config/app";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-white">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <span className="font-serif text-xl font-semibold text-text">{appConfig.name}</span>
      </Link>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}
