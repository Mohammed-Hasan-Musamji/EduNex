/**
 * Text-to-speech provider boundary. The default provider uses the browser's
 * built-in Web Speech API: no credentials, no audio leaves the device, and
 * no server cost. A server-side voice (e.g. a paid TTS API) can be added by
 * implementing `SpeechProvider` without touching the tutor or RAG code.
 */

export interface SpeakOptions {
  rate: number;
  onEnd: () => void;
  onError: (message: string) => void;
}

export interface SpeechProvider {
  readonly id: string;
  isSupported(): boolean;
  speak(text: string, options: SpeakOptions): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export const browserSpeechProvider: SpeechProvider = {
  id: "browser",
  isSupported: () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
  speak(text, { rate, onEnd, onError }) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = document.documentElement.lang || "en-US";
    utterance.onend = () => onEnd();
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" are what stop() produces -- not failures.
      if (event.error === "interrupted" || event.error === "canceled") return;
      onError(event.error || "Speech playback failed.");
    };
    window.speechSynthesis.speak(utterance);
  },
  pause: () => window.speechSynthesis.pause(),
  resume: () => window.speechSynthesis.resume(),
  stop: () => window.speechSynthesis.cancel(),
};

/** Splits text into sentences for progress tracking; strips citation markers like [2] so they aren't read aloud. */
export function toSpokenSentences(text: string): string[] {
  const cleaned = text.replace(/\[\d+\]/g, "").replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return (cleaned.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [cleaned]).map((s) => s.trim()).filter(Boolean);
}
