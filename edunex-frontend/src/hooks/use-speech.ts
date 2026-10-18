"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserSpeechProvider, toSpokenSentences, type SpeechProvider } from "@/lib/speech";

export type SpeechStatus = "idle" | "playing" | "paused" | "error" | "unsupported";

const RATE_KEY = "edunex.speech-rate";
export const SPEECH_RATES = [0.8, 1, 1.2, 1.5] as const;

function storedRate(): number {
  try {
    const value = Number(window.localStorage.getItem(RATE_KEY));
    return SPEECH_RATES.includes(value as (typeof SPEECH_RATES)[number]) ? value : 1;
  } catch {
    return 1;
  }
}

/**
 * Reads text aloud sentence by sentence, exposing the current sentence so the
 * transcript can highlight it. Speaking rate is a per-device preference.
 */
export function useSpeech(text: string, provider: SpeechProvider = browserSpeechProvider) {
  const sentences = useRef<string[]>([]);
  const index = useRef(0);
  const active = useRef(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRateState] = useState(1);

  useEffect(() => {
    // Feature detection and the saved rate are only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!provider.isSupported()) setStatus("unsupported");
    setRateState(storedRate());
  }, [provider]);

  const stop = useCallback(() => {
    active.current = false;
    if (provider.isSupported()) provider.stop();
    setStatus((s) => (s === "unsupported" ? s : "idle"));
    setCurrent(-1);
  }, [provider]);

  // A new text (new answer) or unmount ends any playback of the old one.
  useEffect(() => () => stop(), [text, stop]);

  const speakFrom = useCallback(
    (start: number, speakingRate: number) => {
      index.current = start;
      const next = () => {
        if (!active.current) return;
        if (index.current >= sentences.current.length) {
          active.current = false;
          setStatus("idle");
          setCurrent(-1);
          return;
        }
        setCurrent(index.current);
        provider.speak(sentences.current[index.current], {
          rate: speakingRate,
          onEnd: () => {
            index.current += 1;
            next();
          },
          onError: (message) => {
            active.current = false;
            setError(message);
            setStatus("error");
          },
        });
      };
      next();
    },
    [provider],
  );

  const play = useCallback(() => {
    if (!provider.isSupported()) return;
    if (status === "paused") {
      provider.resume();
      setStatus("playing");
      return;
    }
    provider.stop();
    sentences.current = toSpokenSentences(text);
    if (sentences.current.length === 0) return;
    setError(null);
    active.current = true;
    setStatus("playing");
    speakFrom(0, rate);
  }, [provider, status, text, rate, speakFrom]);

  const pause = useCallback(() => {
    if (status !== "playing") return;
    provider.pause();
    setStatus("paused");
  }, [provider, status]);

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      try {
        window.localStorage.setItem(RATE_KEY, String(value));
      } catch {
        // Storage unavailable (private mode): the rate just won't persist.
      }
      // Apply immediately by restarting the current sentence at the new rate.
      if (active.current && status === "playing") {
        provider.stop();
        active.current = true;
        speakFrom(index.current, value);
      }
    },
    [provider, status, speakFrom],
  );

  const total = toSpokenSentences(text).length;
  return { status, play, pause, stop, rate, setRate, current, total, error, sentences: toSpokenSentences(text) };
}
