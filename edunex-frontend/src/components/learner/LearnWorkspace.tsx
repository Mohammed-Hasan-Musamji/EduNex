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

  const generateLessonFor = async (topicId: string, topicName: string, varkPreferences: VarkPreference[], prompt?: string) => {
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
      return;
    }

    const result = await lessonsApi.create({
      topicId: resolved.id,
      prompt: prompt && prompt.trim() ? prompt : `Explain ${resolved.name}`,
      varkPreferences,
    });

    if (!result.ok) {
      setGenerationError(result.error.message);
      setIsGenerating(false);
      return;
    }

    if (result.data.status === "failed") {
      setGenerationError(result.data.failureReason ?? "Lesson generation failed. Please try again.");
      setIsGenerating(false);
      return;
    }

    if (result.data.lesson) {
      const lesson = result.data.lesson;
      setLesson(lesson, result.data.id);

      const keyConcept = lesson.blocks.find(
        (b): b is Extract<typeof b, { type: "key_concept" }> => b.type === "key_concept",
      );
      const explanation = lesson.blocks.find(
        (b): b is Extract<typeof b, { type: "explanation" }> => b.type === "explanation",
      );
      const directAnswer = keyConcept?.explanation || explanation?.body;

      const hasSpecificPrompt = Boolean(prompt && prompt.trim() && !prompt.startsWith("Explain "));
      const content = hasSpecificPrompt
        ? `${directAnswer ? directAnswer + "\n\n" : ""}I've updated the whiteboard on the left with a dedicated lesson on "${lesson.title}", including step-by-step guidance and interactive visualization.`
        : `I've put together a lesson on ${lesson.topicName}: ${lesson.title}. It's on the whiteboard now — let's start!`;

      appendMessage({
        id: generateId("msg"),
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
        status: "sent",
      });
      setView("whiteboard");
    }
    setIsGenerating(false);
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
    if (isGenerating) return false;

    const userMessage = {
      id: generateId("msg"),
      role: "user" as const,
      content: text,
      createdAt: new Date().toISOString(),
      status: "sent" as const,
    };
    appendMessage(userMessage);

    if (session) {
      // Treat a follow-up message as a new, genuinely-generated request about
      // the same topic -- there is no simulated/instant chat reply here.
      await generateLessonFor(session.topicId, session.topicName, session.varkPreferences, text);
      return true;
    }

    const matchedReal = findBestMatchingRealTopic(realTopics, text);
    if (!matchedReal) {
      appendMessage({
        id: generateId("msg"),
        role: "assistant",
        content:
          realTopics.length > 0
            ? `I can only generate lessons for topics in the real catalog right now: ${realTopics.map((t) => t.name).join(", ")}. Try one of those, or pick a topic from Explore Subjects.`
            : "There are no backend-seeded topics available to generate a lesson for yet.",
        createdAt: new Date().toISOString(),
        status: "sent",
      });
      return true;
    }

    startSession(matchedReal.id, matchedReal.name, []);
    await generateLessonFor(matchedReal.id, matchedReal.name, [], text);
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
          isSending={isGenerating}
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>
    </div>
  );
}
