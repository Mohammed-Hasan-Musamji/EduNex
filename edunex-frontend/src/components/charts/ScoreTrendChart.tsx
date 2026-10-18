"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { PointerEvent } from "react";

export interface ScorePointView {
  id: string;
  label: string;
  kind: "practice" | "diagnostic";
  score: number;
  correct: number;
  total: number;
  completedAt: string;
}

interface ScoreTrendChartProps {
  points: ScorePointView[];
  label: string;
}

const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
const TICKS = [0, 25, 50, 75, 100];

function formatShort(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

/**
 * Single-series line of assessment scores over time (one axis, 0-100%).
 * A crosshair snaps to the nearest round on hover; arrow keys do the same
 * from the keyboard, and a table view carries every value.
 */
export function ScoreTrendChart({ points, label }: ScoreTrendChartProps) {
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  // React 19 ref callbacks may return a cleanup; the chart re-lays out to its container width.
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const coords = useMemo(
    () =>
      points.map((p, i) => ({
        x: PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
        y: PAD.top + innerH - (p.score / 100) * innerH,
      })),
    [points, innerW, innerH],
  );

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area =
    coords.length > 1
      ? `${path} L${coords[coords.length - 1].x.toFixed(1)},${PAD.top + innerH} L${coords[0].x.toFixed(1)},${PAD.top + innerH} Z`
      : "";

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    coords.forEach((c, i) => {
      if (Math.abs(c.x - x) < Math.abs(coords[nearest].x - x)) nearest = i;
    });
    setActive(nearest);
  };

  const activePoint = active !== null ? points[active] : null;
  const activeCoord = active !== null ? coords[active] : null;
  const last = coords[coords.length - 1];
  // Keep the tooltip inside the frame.
  const tooltipLeft = activeCoord ? Math.min(Math.max(activeCoord.x, 90), width - 90) : 0;

  return (
    <div>
      <div ref={measure} className="relative w-full">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(points.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const step = event.key === "ArrowLeft" ? -1 : 1;
            setActive((current) => Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + step)));
          }}
          className="touch-pan-y overflow-visible rounded-md"
        >
          <title id={titleId}>{`${label}. Use left and right arrow keys to read each round.`}</title>
          {TICKS.map((t) => {
            const y = PAD.top + innerH - (t / 100) * innerH;
            return (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                <text x={PAD.left - 8} y={y} dy="0.32em" textAnchor="end" className="tabular fill-text-subtle text-[11px]">
                  {t}%
                </text>
              </g>
            );
          })}

          {points.length > 0 && (
            <>
              <text x={PAD.left} y={HEIGHT - 8} className="fill-text-subtle text-[11px]">
                {formatShort(points[0].completedAt)}
              </text>
              {points.length > 1 && (
                <text x={width - PAD.right} y={HEIGHT - 8} textAnchor="end" className="fill-text-subtle text-[11px]">
                  {formatShort(points[points.length - 1].completedAt)}
                </text>
              )}
            </>
          )}

          {area && <path d={area} fill="var(--color-primary)" opacity={0.1} />}
          {coords.length > 1 && (
            <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {activeCoord && (
            <line x1={activeCoord.x} x2={activeCoord.x} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--viz-axis)" strokeWidth={1} />
          )}

          {coords.map((c, i) => (
            <circle
              key={points[i].id}
              cx={c.x}
              cy={c.y}
              r={active === i ? 6 : 4}
              fill={points[i].kind === "diagnostic" ? "var(--color-card)" : "var(--color-primary)"}
              stroke={points[i].kind === "diagnostic" ? "var(--color-primary)" : "var(--color-card)"}
              strokeWidth={2}
            />
          ))}

          {last && (
            <text x={last.x} y={last.y - 12} textAnchor="end" className="fill-text text-[12px] font-semibold">
              {Math.round(points[points.length - 1].score)}%
            </text>
          )}
        </svg>

        {activePoint && activeCoord && (
          <div
            className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md"
            style={{ left: tooltipLeft, top: Math.max(0, activeCoord.y - 78) }}
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-text">
              {Math.round(activePoint.score)}%{" "}
              <span className="font-normal text-text-muted">
                ({activePoint.correct}/{activePoint.total})
              </span>
            </p>
            <p className="truncate text-text-muted">{activePoint.label}</p>
            <p className="text-text-subtle">
              {activePoint.kind === "diagnostic" ? "Diagnostic" : "Practice"} · {formatShort(activePoint.completedAt)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-subtle">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" /> Practice round
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-primary bg-card" /> Diagnostic
          </span>
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
        <div className="mt-3 max-h-60 overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 font-medium">Assessment</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[...points].reverse().map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-1.5">{formatShort(p.completedAt)}</td>
                  <td className="px-3 py-1.5">
                    {p.label} <span className="text-text-subtle">({p.kind})</span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {Math.round(p.score)}% ({p.correct}/{p.total})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
