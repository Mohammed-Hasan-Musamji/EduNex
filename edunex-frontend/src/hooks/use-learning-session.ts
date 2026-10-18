"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, LearningSession, Lesson } from "@/types/lesson";
import type { VarkPreference } from "@/types/learner";
import { generateId } from "@/lib/utils";

const STORAGE_KEY = "edunex.learning-session.v1";

function loadSession(): LearningSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LearningSession;
    session.messages = session.messages.filter(
      (message) =>
        message.role !== "assistant" ||
        (!message.content.includes("I've put together a lesson on ") &&
          !message.content.includes("I've updated the whiteboard on the left")),
    );
    return session;
  } catch {
    return null;
  }
}

function persistSession(session: LearningSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Tracks the learner's in-progress Learn with AI session for this browser
 * tab only. This is non-authoritative UI continuity, not persisted learner
 * state — generated lessons and chat answers come from the backend.
 */
export function useLearningSession() {
  const [session, setSession] = useState<LearningSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    // Reading sessionStorage must happen after mount to avoid an SSR/client
    // hydration mismatch, so this one-time restore intentionally sets state
    // directly inside the effect rather than deriving it during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(loadSession());
    setIsRestoring(false);
  }, []);

  const startSession = useCallback((topicId: string, topicName: string, varkPreferences: VarkPreference[]) => {
    const next: LearningSession = {
      id: generateId("session"),
      topicId,
      topicName,
      varkPreferences,
      lesson: null,
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setSession(next);
    persistSession(next);
    return next;
  }, []);

  const setLesson = useCallback((lesson: Lesson, lessonSessionId?: string) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, lesson, lessonSessionId, updatedAt: new Date().toISOString() };
      persistSession(next);
      return next;
    });
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, messages: [...current.messages, message], updatedAt: new Date().toISOString() };
      persistSession(next);
      return next;
    });
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setSession((current) => {
      if (!current) return current;
      const next = {
        ...current,
        messages: current.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
      };
      persistSession(next);
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, []);

  return { session, isRestoring, startSession, setLesson, appendMessage, updateMessage, clearSession };
}
