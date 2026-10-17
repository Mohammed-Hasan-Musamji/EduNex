"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { useLearner } from "@/hooks/use-learner";
import { routes } from "@/lib/routes";

/**
 * Ensures a (device-local, unauthenticated) learner profile exists before
 * rendering learner pages. There is no real session here -- see
 * src/lib/learner-storage.ts and backend/README.md "Known limitations".
 */
export function LearnerGate({ children }: { children: ReactNode }) {
  const { learner, isLoading } = useLearner();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !learner) {
      router.replace(routes.register);
    }
  }, [isLoading, learner, router]);

  if (isLoading) {
    return <LoadingState label="Loading your profile…" className="py-24" />;
  }

  if (!learner) {
    return <LoadingState label="Redirecting to create a profile…" className="py-24" />;
  }

  return <>{children}</>;
}
