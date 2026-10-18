"use client";

import { Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { SPEECH_RATES, useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

interface ListenControlsProps {
  text: string;
  label?: string;
  /** Show the sentence-by-sentence transcript with the spoken sentence highlighted. */
  showTranscript?: boolean;
  className?: string;
}

/**
 * Play/pause/resume/stop and speed for reading an explanation aloud, with a
 * live transcript. Uses the device's speech engine; the text read is exactly
 * the text shown (citation markers are skipped when speaking).
 */
export function ListenControls({ text, label = "Listen", showTranscript = false, className }: ListenControlsProps) {
  const speech = useSpeech(text);

  if (speech.status === "unsupported") {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs text-text-subtle", className)}>
        <VolumeX className="size-3.5" aria-hidden="true" /> Audio playback isn&apos;t supported in this browser.
      </p>
    );
  }

  const playing = speech.status === "playing";
  const paused = speech.status === "paused";
  const progress = speech.total > 0 && speech.current >= 0 ? ((speech.current + 1) / speech.total) * 100 : 0;

  return (
    <div className={cn("rounded-[var(--radius-md)] border border-border bg-surface-2/60 p-2.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={playing ? speech.pause : speech.play}
          aria-label={playing ? "Pause audio" : paused ? "Resume audio" : `${label}: read aloud`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {playing ? "Pause" : paused ? "Resume" : label}
        </button>
        {(playing || paused) && (
          <button
            type="button"
            onClick={speech.stop}
            aria-label="Stop audio"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-text-muted hover:text-text"
          >
            <Square className="size-3.5" aria-hidden="true" />
          </button>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-text-muted">
          <Volume2 className="size-3.5" aria-hidden="true" />
          Speed
          <select
            value={speech.rate}
            onChange={(e) => speech.setRate(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-card px-1.5 text-xs text-text"
          >
            {SPEECH_RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>
      {(playing || paused) && (
        <div className="mt-2 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={speech.total}
            aria-valuenow={speech.current + 1}
            className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular text-[11px] text-text-subtle">
            {speech.current + 1}/{speech.total}
          </span>
        </div>
      )}
      {speech.status === "error" && (
        <p role="alert" className="mt-2 text-xs text-error">
          Audio stopped: {speech.error}. The text above is unaffected.
        </p>
      )}
      {showTranscript && (playing || paused) && (
        <p className="mt-2 text-sm leading-relaxed text-text-muted" aria-live="off">
          {speech.sentences.map((sentence, i) => (
            <span key={i} className={cn(i === speech.current && "rounded bg-gold-soft text-text")}>
              {sentence}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
