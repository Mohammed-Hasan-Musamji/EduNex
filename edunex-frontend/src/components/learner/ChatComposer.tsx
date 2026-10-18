"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { chatPromptSchema, PROMPT_MAX_LENGTH } from "@/lib/schemas";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (text: string) => Promise<boolean>;
  isSending: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, isSending, placeholder }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (isSending) return;
    const parsed = chatPromptSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid message");
      return;
    }
    setError(null);
    playClickSound();
    const sent = await onSend(parsed.data);
    if (sent) setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="border-t border-border/80 bg-card/40 p-3 sm:p-4 backdrop-blur-sm">
      <Textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        rows={2}
        maxLength={PROMPT_MAX_LENGTH}
        placeholder={placeholder ?? "Ask EduNex anything, or name a topic to learn…"}
        aria-label="Message EduNex"
        error={error ?? undefined}
        disabled={isSending}
        className="rounded-2xl transition-all duration-200 focus:ring-2 focus:ring-primary/25"
      />
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {draft.length}/{PROMPT_MAX_LENGTH} · Enter to send
        </span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSending || !draft.trim()}
          onMouseEnter={playHoverTick}
          className={cn(
            "group relative inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:scale-95",
            (!draft.trim() || isSending) && "opacity-50 pointer-events-none"
          )}
        >
          <Send className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          <span>{isSending ? "Thinking…" : "Send"}</span>
        </button>
      </div>
    </div>
  );
}
