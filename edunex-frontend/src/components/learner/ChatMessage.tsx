import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/lesson";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm",
          isUser ? "bg-primary text-white" : "border border-border bg-white text-text",
          message.status === "failed" && "border-error",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.status === "sending" && <p className="mt-1 text-xs opacity-70">Sending…</p>}
        {message.status === "failed" && (
          <p className="mt-1 flex items-center gap-1 text-xs text-error">
            <AlertCircle className="size-3" aria-hidden="true" />
            Couldn&apos;t send. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
