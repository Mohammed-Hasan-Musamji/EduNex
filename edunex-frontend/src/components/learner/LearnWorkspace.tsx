"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LearningFeed } from "./LearningFeed";
import { LearningWhiteboard } from "./LearningWhiteboard";
import { AIChatPanel } from "./AIChatPanel";
import { useLearningSession } from "@/hooks/use-learning-session";
import { useLearner } from "@/hooks/use-learner";
import { lessonsApi, progressApi } from "@/lib/api-client";
import { listAllRealTopics, findBestMatchingRealTopic } from "@/lib/real-topics";
import { generateId } from "@/lib/utils";
import type { VarkPreference } from "@/types/learner";
import type { Topic } from "@/types/content";
import type { CurrentLearningStatus, StruggleArea, NextStepRecommendation } from "@/types/learner";

interface LearnWorkspaceProps {
  initialTopicId: string | null;
  initialVarkPreferences: VarkPreference[];
  initialLessonSessionId?: string | null;
}

const SUGGESTED_PROMPTS = ["Explain how a linked list works", "Help me traverse a linked list step by step"];

type View = "feed" | "whiteboard";

export function LearnWorkspace({ initialTopicId, initialVarkPreferences, initialLessonSessionId }: LearnWorkspaceProps) {
  const { session, isRestoring, startSession, setLesson, appendMessage, clearSession } = useLearningSession();
  const { learner } = useLearner();

  const [view, setView] = useState<View>("feed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [topicUnavailable, setTopicUnavailable] = useState<string | null>(null);
  const [realTopics, setRealTopics] = useState<Topic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const hasHandledInitialTopic = useRef(false);

  const [currentLearning, setCurrentLearning] = useState<CurrentLearningStatus | null>(null);
  const [struggleAreas, setStruggleAreas] = useState<StruggleArea[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStepRecommendation[]>([]);

  useEffect(() => {
    void listAllRealTopics().then((topics) => {
      setRealTopics(topics);
      setTopicsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!learner) return;

    void lessonsApi.listForLearner(learner.id).then((res) => {
      const mostRecent = res.ok ? res.data[0] : undefined;
      if (mostRecent) {
        setCurrentLearning({
          topicId: mostRecent.topicId,
          topicName: mostRecent.topicName,
          objective: mostRecent.prompt,
          status: mostRecent.status === "ready" ? "in_progress" : "not_started",
        });
      }
    });

    void progressApi.recommendations(learner.id).then((res) => {
      if (!res.ok) return;
      setStruggleAreas(
        res.data
          .filter((r) => r.recommendationType === "review")
          .map((r) => ({ topicId: r.topicId, topicName: r.topicName, conceptName: r.label, reason: r.rationale })),
      );
      setNextSteps(
        res.data.map((r) => ({
          kind: r.recommendationType === "review" ? "review" : r.recommendationType === "practice_harder" ? "practice" : "lesson",
          title: r.label,
          description: r.rationale,
          topicId: r.topicId,
          href: `/learner/learn?topic=${r.topicId}`,
        })),
      );
    });
  }, [learner]);

  const resolveTopic = (topicId: string, fallbackName: string): { id: string; name: string; isReal: boolean } => {
    const real = realTopics.find((t) => t.id === topicId);
    if (real) return { id: real.id, name: real.name, isReal: true };
    return { id: topicId, name: fallbackName, isReal: false };
  };

  const generateLessonFor = async (
    topicId: string,
    topicName: string,
    varkPreferences: VarkPreference[],
    prompt?: string,
  ): Promise<string | null> => {
    setIsGenerating(true);
    setGenerationError(null);
    setTopicUnavailable(null);

    const resolved = resolveTopic(topicId, topicName);

    if (!resolved.isReal) {
      setTopicUnavailable(
        `"${resolved.name}" isn't in the real course catalog yet. Pick a topic from Explore Subjects, or ask about: ${
          realTopics.map((t) => t.name).join(", ") || "a topic once one has been added"
        }.`,
      );
      setIsGenerating(false);
      return null;
    }

    const result = await lessonsApi.create({
      topicId: resolved.id,
      prompt: prompt && prompt.trim() ? prompt : `Explain ${resolved.name}`,
      varkPreferences,
    });

    if (!result.ok) {
      setGenerationError(result.error.message);
      setIsGenerating(false);
      return null;
    }

    if (result.data.status === "failed") {
      setGenerationError(result.data.failureReason ?? "Lesson generation failed. Please try again.");
      setIsGenerating(false);
      return null;
    }

    if (result.data.lesson) {
      const lesson = result.data.lesson;
      setLesson(lesson, result.data.id);
      setView("whiteboard");
      setIsGenerating(false);
      return result.data.id;
    }
    setIsGenerating(false);
    return null;
  };

  const resumeRealSession = async (lessonSessionId: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    const result = await lessonsApi.get(lessonSessionId);
    setIsGenerating(false);
    if (!result.ok) {
      setGenerationError(
        result.error.kind === "not_found"
          ? "That saved lesson could not be found. It may have been removed."
          : result.error.message,
      );
      return;
    }
    startSession(result.data.topicId, result.data.lesson?.topicName ?? result.data.topicId, result.data.varkPreferences);
    if (result.data.lesson) {
      setLesson(result.data.lesson, result.data.id);
      setView("whiteboard");
    }
  };

  useEffect(() => {
    // Wait for the real-topics list before resolving initialTopicId, so a
    // real backend topic is never mistaken for an unavailable one just
    // because this fetch hasn't resolved yet.
    if (isRestoring || !topicsLoaded || hasHandledInitialTopic.current) return;
    hasHandledInitialTopic.current = true;

    if (initialLessonSessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void resumeRealSession(initialLessonSessionId);
      return;
    }

    if (initialTopicId) {
      if (session?.topicId === initialTopicId) {
        if (session.lesson) {
          setView("whiteboard");
        } else {
          void generateLessonFor(initialTopicId, initialTopicId, initialVarkPreferences);
        }
        return;
      }
      startSession(initialTopicId, initialTopicId, initialVarkPreferences);
      void generateLessonFor(initialTopicId, initialTopicId, initialVarkPreferences);
      return;
    }

    if (session?.lesson) {
      setView("whiteboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoring, topicsLoaded]);

  const handleSend = async (text: string): Promise<boolean> => {
    if (isGenerating || isChatting) return false;

    const previousHistory = (session?.messages ?? [])
      .filter((message) => message.status !== "failed" && message.status !== "sending")
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    const userMessage = {
      id: generateId("msg"),
      role: "user" as const,
      content: text,
      createdAt: new Date().toISOString(),
      status: "sent" as const,
    };
    appendMessage(userMessage);

    let lessonSessionId = session?.lessonSessionId ?? null;
    if (session) {
      if (!lessonSessionId) {
        lessonSessionId = await generateLessonFor(session.topicId, session.topicName, session.varkPreferences, text);
      }
    } else {
      const matchedReal = findBestMatchingRealTopic(realTopics, text);
      if (!matchedReal) {
        appendMessage({
          id: generateId("msg"),
          role: "assistant",
          content:
            realTopics.length > 0
              ? `I can only start a lesson for a topic in the course catalog: ${realTopics.map((t) => t.name).join(", ")}. Pick a topic from Explore Subjects, then ask me about it.`
              : "There are no course topics available yet. Please ask your teacher to add a topic first.",
          createdAt: new Date().toISOString(),
          status: "failed",
        });
        return true;
      }

      startSession(matchedReal.id, matchedReal.name, []);
      lessonSessionId = await generateLessonFor(matchedReal.id, matchedReal.name, [], text);
    }

    if (!lessonSessionId) return true;

    setIsChatting(true);
    const response = await lessonsApi.chat(lessonSessionId, text, previousHistory);
    setIsChatting(false);
    if (response.ok && response.data.lesson) {
      setLesson(response.data.lesson, lessonSessionId);
    }
    appendMessage({
      id: generateId("msg"),
      role: "assistant",
      content: response.ok ? response.data.answer : `Gemini could not answer: ${response.error.message}`,
      createdAt: new Date().toISOString(),
      status: response.ok ? "sent" : "failed",
    });
    return true;
  };

  const handleBackToFeed = () => setView("feed");
  const handleNewTopic = () => {
    clearSession();
    setGenerationError(null);
    setTopicUnavailable(null);
    setView("feed");
  };

  if (isRestoring) {
    return <LoadingState label="Restoring your session…" className="py-20" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        {view === "whiteboard" && session?.lesson ? (
          <LearningWhiteboard
            lesson={session.lesson}
            lessonSessionId={session.lessonSessionId}
            onBackToFeed={handleBackToFeed}
            onNewTopic={handleNewTopic}
          />
        ) : isGenerating ? (
          <LoadingState label="Generating your lesson…" className="py-20" />
        ) : generationError ? (
          <ErrorState
            description={generationError}
            onRetry={() => session && void generateLessonFor(session.topicId, session.topicName, session.varkPreferences)}
          />
        ) : topicUnavailable ? (
          <EmptyState title="Topic not available yet" description={topicUnavailable} />
        ) : (
          <LearningFeed currentLearning={currentLearning} struggleAreas={struggleAreas} nextSteps={nextSteps} />
        )}
      </div>

      <div className="min-h-[420px] rounded-2xl border border-border/80 bg-card shadow-xs lg:min-h-0">
        <AIChatPanel
          messages={session?.messages ?? []}
          onSend={handleSend}
          isSending={isGenerating || isChatting}
          // suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>
    </div>
  );
}
