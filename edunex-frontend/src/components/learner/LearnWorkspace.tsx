"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LearningFeed } from "./LearningFeed";
import { LearningWhiteboard } from "./LearningWhiteboard";
import { AIChatPanel } from "./AIChatPanel";
import { useLearningSession } from "@/hooks/use-learning-session";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { lessonsApi } from "@/lib/api-client";
import { isBackendUnavailable } from "@/types/api";
import { generateDemoLesson, demoCurrentLearning, demoNextSteps, demoStruggleAreas } from "@/lib/demo-data";
import { listAllRealTopics, findBestMatchingRealTopic } from "@/lib/real-topics";
import { generateId, slugify } from "@/lib/utils";
import type { VarkPreference } from "@/types/learner";
import type { Topic } from "@/types/content";

interface LearnWorkspaceProps {
  initialTopicId: string | null;
  initialVarkPreferences: VarkPreference[];
  initialLessonSessionId?: string | null;
}

const SUGGESTED_PROMPTS = [
  "Explain how a linked list works",
  "What's the difference between a stack and a queue?",
  "Review Newton's Laws of motion",
  "Help me understand limits in calculus",
];

type View = "feed" | "whiteboard";

export function LearnWorkspace({ initialTopicId, initialVarkPreferences, initialLessonSessionId }: LearnWorkspaceProps) {
  const { session, isRestoring, startSession, setLesson, appendMessage, updateMessage, clearSession } =
    useLearningSession();
  const { learner } = useLearner();
  const { showToast } = useToast();

  const [view, setView] = useState<View>("feed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [offerDemoPreview, setOfferDemoPreview] = useState<{ topicId: string; topicName: string; prompt?: string } | null>(
    null,
  );
  const [realTopics, setRealTopics] = useState<Topic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const hasHandledInitialTopic = useRef(false);

  useEffect(() => {
    void listAllRealTopics().then((topics) => {
      setRealTopics(topics);
      setTopicsLoaded(true);
    });
  }, []);

  const resolveTopic = (topicId: string, fallbackName: string): { id: string; name: string; isReal: boolean } => {
    const real = realTopics.find((t) => t.id === topicId);
    if (real) return { id: real.id, name: real.name, isReal: true };
    return { id: topicId, name: fallbackName, isReal: false };
  };

  const showDemoLesson = (topicId: string, topicName: string, prompt?: string) => {
    const lesson = generateDemoLesson(topicId, topicName, prompt);
    setLesson(lesson);
    appendMessage({
      id: generateId("msg"),
      role: "assistant",
      content: `Here's a demo preview lesson on ${lesson.topicName}. This is local demo content, not a live Gemini response.`,
      createdAt: new Date().toISOString(),
      status: "sent",
    });
    setView("whiteboard");
    setOfferDemoPreview(null);
  };

  const generateLessonFor = async (topicId: string, topicName: string, varkPreferences: VarkPreference[], prompt?: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    setOfferDemoPreview(null);

    const resolved = resolveTopic(topicId, topicName);

    if (!resolved.isReal || !learner) {
      // No real backend-seeded content for this topic (or no learner yet) --
      // go straight to a clearly-labeled demo preview, never pretend it's AI-generated.
      showDemoLesson(resolved.id, resolved.name, prompt);
      setIsGenerating(false);
      return;
    }

    const result = await lessonsApi.create({
      learnerId: learner.id,
      topicId: resolved.id,
      prompt: prompt && prompt.trim() ? prompt : `Explain ${resolved.name}`,
      varkPreferences,
    });

    if (!result.ok) {
      if (isBackendUnavailable(result.error)) {
        showDemoLesson(resolved.id, resolved.name, prompt);
      } else if (result.error.kind === "service_unavailable") {
        setGenerationError(null);
        showToast({
          variant: "warning",
          title: "Lesson generation unavailable",
          description: "We couldn't generate your lesson right now. Your existing session has been preserved.",
        });
        setOfferDemoPreview({ topicId: resolved.id, topicName: resolved.name, prompt });
      } else {
        setGenerationError(result.error.message);
      }
      setIsGenerating(false);
      return;
    }

    if (result.data.status === "failed") {
      showToast({
        variant: "warning",
        title: "Lesson generation unavailable",
        description: result.data.failureReason ?? "Lesson generation failed. Your existing session has been preserved.",
      });
      setOfferDemoPreview({ topicId: resolved.id, topicName: resolved.name, prompt });
      setIsGenerating(false);
      return;
    }

    if (result.data.lesson) {
      setLesson(result.data.lesson, result.data.id);
      appendMessage({
        id: generateId("msg"),
        role: "assistant",
        content: `I've put together a lesson on ${result.data.lesson.topicName}. It's on the whiteboard now — let's start!`,
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
    // real backend topic is never mistaken for a demo-only one just because
    // this fetch hasn't resolved yet.
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

    if (view === "whiteboard" && session?.lesson) {
      appendMessage(userMessage);
      const replyId = generateId("msg");
      appendMessage({
        id: replyId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "sending",
      });
      await new Promise((resolve) => setTimeout(resolve, 600));
      updateMessage(replyId, {
        status: "sent",
        content:
          "This is a demo response — live follow-up chat grounded in the current lesson isn't implemented on the backend yet.",
      });
      return true;
    }

    const matchedReal = findBestMatchingRealTopic(realTopics, text);
    const topicId = session?.topicId ?? matchedReal?.id ?? slugify(text);
    const topicName = matchedReal?.name ?? text;
    if (!session) {
      startSession(topicId, topicName, []);
    }
    appendMessage(userMessage);
    await generateLessonFor(topicId, topicName, session?.varkPreferences ?? [], text);
    return true;
  };

  const handleBackToFeed = () => setView("feed");
  const handleNewTopic = () => {
    clearSession();
    setGenerationError(null);
    setOfferDemoPreview(null);
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
        ) : offerDemoPreview ? (
          <ErrorState
            title="Lesson generation unavailable"
            description="We couldn't generate your lesson right now. You can preview a clearly-labeled demo lesson instead, or try again once the AI service is available."
            onRetry={() =>
              void generateLessonFor(offerDemoPreview.topicId, offerDemoPreview.topicName, session?.varkPreferences ?? [], offerDemoPreview.prompt)
            }
          >
            <button
              type="button"
              onClick={() => showDemoLesson(offerDemoPreview.topicId, offerDemoPreview.topicName, offerDemoPreview.prompt)}
              className="mt-2 text-sm font-medium text-primary underline"
            >
              Preview with demo content instead
            </button>
          </ErrorState>
        ) : (
          <LearningFeed
            currentLearning={demoCurrentLearning}
            struggleAreas={demoStruggleAreas}
            nextSteps={demoNextSteps}
          />
        )}
      </div>

      <div className="min-h-[420px] rounded-lg border border-border bg-white lg:min-h-0">
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
