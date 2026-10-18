import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LearnerGate } from "@/components/learner/LearnerGate";
import { GamificationProvider } from "@/components/gamification/GamificationProvider";

export default function LearnerLayout({ children }: { children: ReactNode }) {
  return (
    <GamificationProvider>
      <AppShell variant="learner">
        <LearnerGate>{children}</LearnerGate>
      </AppShell>
    </GamificationProvider>
  );
}
