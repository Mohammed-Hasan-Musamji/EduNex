interface LessonProgressProps {
  percentage: number;
}

export function LessonProgress({ percentage }: LessonProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Lesson reading progress"
        className="h-1.5 w-28 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-text-muted">{clamped}%</span>
    </div>
  );
}
