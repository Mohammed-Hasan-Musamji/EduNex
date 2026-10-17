import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LearnerGate } from "@/components/learner/LearnerGate";

export default function LearnerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell variant="learner">
      <LearnerGate>{children}</LearnerGate>
    </AppShell>
  );
}
