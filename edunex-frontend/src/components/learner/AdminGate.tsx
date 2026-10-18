"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { useLearner } from "@/hooks/use-learner";
import { routes } from "@/lib/routes";

/**
 * Client-side convenience redirect only -- every admin API route
 * independently re-checks `role == admin` server-side (see
 * backend/app/api/deps.py:require_admin), so this never substitutes for
 * that enforcement.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { learner, isLoading } = useLearner();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!learner) {
      router.replace(routes.login);
    } else if (learner.role !== "admin") {
      router.replace(routes.learner.dashboard);
    }
  }, [isLoading, learner, router]);

  if (isLoading || !learner || learner.role !== "admin") {
    return <LoadingState label="Checking your access…" className="py-24" />;
  }

  return <>{children}</>;
}
