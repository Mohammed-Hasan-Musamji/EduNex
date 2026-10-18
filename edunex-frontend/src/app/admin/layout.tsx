import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminGate } from "@/components/learner/AdminGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell variant="admin">
      <AdminGate>{children}</AdminGate>
    </AppShell>
  );
}
