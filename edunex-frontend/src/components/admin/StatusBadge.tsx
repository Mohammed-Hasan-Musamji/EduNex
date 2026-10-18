import { Badge, type BadgeTone } from "@/components/ui/Badge";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const toneMap: Record<StatusTone, BadgeTone> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "accent",
  neutral: "neutral",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <Badge tone={toneMap[tone]} className="capitalize">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
