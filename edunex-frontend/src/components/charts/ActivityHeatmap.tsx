"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  days: { date: string; count: number }[];
  /** What a "count" is, e.g. "learning activity" or "questions answered". */
  unit: string;
  label: string;
}

const LEVEL_FILL = ["var(--color-surface-2)", "var(--viz-heat-1)", "var(--viz-heat-2)", "var(--viz-heat-3)", "var(--viz-heat-4)"];

function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  return Math.max(1, Math.ceil((count / max) * 4));
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/**
 * Calendar heatmap: one cell per day, weeks as columns. A one-hue ordinal
 * ramp (validated, see globals.css --viz-heat-*) encodes how much happened;
 * zero days are a neutral surface cell. Pointer hover or arrow keys (one tab
 * stop for the whole grid) read out a day; every value is also in the table view.
 */
export function ActivityHeatmap({ days, unit, label }: ActivityHeatmapProps) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(0, ...days.map((d) => d.count));

  // Pad the front so the first column starts on Monday.
  const firstWeekday = days.length ? (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const cells: ({ date: string; count: number; index: number } | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...days.map((d, index) => ({ ...d, index })),
  ];
  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  const activeDay = active !== null ? days[active] : null;

  return (
    <div>
      <div className="relative">
        <div
          role="group"
          tabIndex={0}
          aria-label={`${label}. Use arrow keys to move between days.`}
          onKeyDown={(event) => {
            const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
            if (step === undefined || days.length === 0) return;
            event.preventDefault();
            setActive((current) => Math.min(days.length - 1, Math.max(0, (current ?? days.length - 1) + step)));
          }}
          onFocus={() => setActive((current) => current ?? days.length - 1)}
          onBlur={() => setActive(null)}
          className="flex w-max gap-[3px] rounded-md"
        >
          {columns.map((column, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {column.map((cell, ri) =>
                cell ? (
                  <span
                    key={cell.date}
                    onPointerEnter={() => setActive(cell.index)}
                    onPointerLeave={() => setActive(null)}
                    className={cn(
                      "size-[18px] rounded-[4px] transition-transform duration-150 sm:size-5",
                      levelFor(cell.count, max) === 0 && "ring-1 ring-inset ring-border",
                      active === cell.index && "scale-110 ring-2 ring-text ring-offset-1 ring-offset-card",
                    )}
                    style={{ background: LEVEL_FILL[levelFor(cell.count, max)] }}
                  />
                ) : (
                  <span key={`pad-${ri}`} className="size-[18px] sm:size-5" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-xs text-text-muted" aria-live="polite">
          {activeDay ? (
            <>
              <span className="font-semibold text-text">
                {activeDay.count} {unit}
              </span>{" "}
              · {formatDay(activeDay.date)}
            </>
          ) : (
            <span aria-hidden="true">Hover or focus a day for details.</span>
          )}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-text-subtle" aria-hidden="true">
          <span>Less</span>
          {LEVEL_FILL.map((fill, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", i === 0 && "ring-1 ring-inset ring-border")} style={{ background: fill }} />
          ))}
          <span>More</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
          aria-expanded={showTable}
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      {showTable && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Day</th>
                <th scope="col" className="px-3 py-2 text-right font-medium capitalize">{unit}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="px-3 py-1.5">{formatDay(d.date)}</td>
                  <td className="px-3 py-1.5 text-right">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
