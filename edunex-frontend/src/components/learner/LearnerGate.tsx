"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { useLearner } from "@/hooks/use-learner";
import { routes } from "@/lib/routes";

/**
 * Ensures a real, authenticated session exists (verified server-side via the
 * httpOnly session cookie, see GET /api/v1/auth/me) before rendering learner
 * pages.
 */
export function LearnerGate({ children }: { children: ReactNode }) {
  const { learner, isLoading } = useLearner();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !learner) {
      router.replace(routes.login);
    }
  }, [isLoading, learner, router]);

  if (isLoading) {
    return <LoadingState label="Loading your profile…" className="py-24" />;
  }

  if (!learner) {
    return <LoadingState label="Redirecting to sign in…" className="py-24" />;
  }

  return <>{children}</>;
}
