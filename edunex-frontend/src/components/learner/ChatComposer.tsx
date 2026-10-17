"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { chatPromptSchema, PROMPT_MAX_LENGTH } from "@/lib/schemas";

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
    <div className="border-t border-border p-3">
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
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {draft.length}/{PROMPT_MAX_LENGTH} · Enter to send, Shift+Enter for a new line
        </span>
        <Button type="button" size="sm" onClick={() => void submit()} isLoading={isSending} disabled={!draft.trim()}>
          <Send className="size-4" aria-hidden="true" />
          Send
        </Button>
      </div>
    </div>
  );
}
