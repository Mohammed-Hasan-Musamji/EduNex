"use client";

import { useEffect, useRef } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import type { ChatMessage as ChatMessageType } from "@/types/lesson";

interface AIChatPanelProps {
  messages: ChatMessageType[];
  onSend: (text: string) => Promise<boolean>;
  isSending: boolean;
  suggestedPrompts?: string[];
}

export function AIChatPanel({ messages, onSend, isSending, suggestedPrompts = [] }: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircleQuestion className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-serif text-sm font-medium text-text">Chat with EduNex</h2>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">Ask a question, or try one of these:</p>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void onSend(prompt)}
                className="rounded-md border border-border bg-white px-3 py-2 text-left text-sm text-text hover:bg-ivory"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </div>

      <ChatComposer onSend={onSend} isSending={isSending} />
    </div>
  );
}
