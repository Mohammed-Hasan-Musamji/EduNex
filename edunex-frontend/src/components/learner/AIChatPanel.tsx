"use client";

import { useEffect, useRef } from "react";
import { Bot, MessageCircleQuestion, Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
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
      {/* Elevated Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-2xs">
            <Bot className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-sm font-bold tracking-tight text-text leading-tight">
              Chat with EduNex AI
            </h2>
            <p className="text-[10px] text-text-muted">Real-time Socratic Tutor</p>
          </div>
        </div>

        {/* Live Indicator */}
        <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success border border-success/20">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          <span>Active</span>
        </span>
      </div>

      {/* Messages / Prompts Feed */}
      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <Sparkles className="size-3.5 text-secondary" />
              <span>Ask a question or tap a prompt:</span>
            </div>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onMouseEnter={playHoverTick}
                onClick={() => {
                  playClickSound();
                  void onSend(prompt);
                }}
                className="group flex items-start gap-2.5 rounded-2xl border border-border/80 bg-card p-3 text-left text-xs font-medium text-text shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-ivory hover:shadow-xs active:scale-[0.99]"
              >
                <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5 transition-transform group-hover:rotate-12" />
                <span className="leading-relaxed group-hover:text-primary transition-colors">{prompt}</span>
              </button>
            ))}
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </div>

      {/* Composer */}
      <ChatComposer onSend={onSend} isSending={isSending} />
    </div>
  );
}
