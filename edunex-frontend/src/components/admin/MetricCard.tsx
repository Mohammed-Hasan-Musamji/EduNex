import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}

export function MetricCard({ label, value, icon: Icon, hint }: MetricCardProps) {
  return (
    <Card className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="font-serif text-2xl font-semibold text-text">{value}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
