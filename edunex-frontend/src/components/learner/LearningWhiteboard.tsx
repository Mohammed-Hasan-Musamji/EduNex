"use client";

import { useRef, useState } from "react";
import type { UIEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, ClipboardCheck, Sparkles } from "lucide-react";
import { ListenControls } from "@/components/audio/ListenControls";
import { useGamification } from "@/components/gamification/GamificationProvider";
import { Button } from "@/components/ui/Button";
import { LessonProgress } from "./LessonProgress";
import { LessonRenderer } from "./LessonRenderer";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { lessonsApi, savedLessonsApi } from "@/lib/api-client";
import { isBackendUnavailable } from "@/types/api";
import { routes } from "@/lib/routes";
import type { Lesson } from "@/types/lesson";

/** The lesson's readable text, in order, for read-aloud (the same words shown on the whiteboard). */
function lessonSpeechText(lesson: Lesson): string {
  const parts: string[] = [lesson.title];
  for (const block of lesson.blocks) {
    if (block.type === "explanation") parts.push(`${block.heading}. ${block.body}`);
    else if (block.type === "key_concept") parts.push(`Key concept: ${block.title}. ${block.explanation}`);
    else if (block.type === "step_by_step_example") parts.push(`${block.title}. ${block.steps.join(". ")}`);
    else if (block.type === "summary") parts.push(`Summary. ${block.points.join(". ")}`);
  }
  return parts.map((p) => p.trim().replace(/([^.!?])$/, "$1.")).join(" ");
}

interface LearningWhiteboardProps {
  lesson: Lesson;
  lessonSessionId?: string;
  onBackToFeed: () => void;
  onNewTopic: () => void;
}

export function LearningWhiteboard({ lesson, lessonSessionId, onBackToFeed, onNewTopic }: LearningWhiteboardProps) {
  const [progress, setProgress] = useState(0);
  const [isConfirmingNewTopic, setIsConfirmingNewTopic] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { learner } = useLearner();
  const { showToast } = useToast();
  const { celebrate } = useGamification();
  const [completed, setCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (!lessonSessionId || isCompleting || completed) return;
    setIsCompleting(true);
    const result = await lessonsApi.complete(lessonSessionId);
    setIsCompleting(false);
    if (!result.ok) {
      showToast({ variant: "error", title: "Couldn't mark the lesson complete", description: result.error.message });
      return;
    }
    setCompleted(true);
    celebrate(result.data.rewards, { title: "Lesson complete", message: lesson.title });
  };

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const scrollable = el.scrollHeight - el.clientHeight;
    setProgress(scrollable <= 0 ? 100 : (el.scrollTop / scrollable) * 100);
  };

  const handleSave = async () => {
    if (!learner || !lessonSessionId || isSaving || isSaved) return;
    setIsSaving(true);
    const result = await savedLessonsApi.save(learner.id, lessonSessionId);
    setIsSaving(false);
    if (!result.ok) {
      if (result.error.kind === "conflict") {
        setIsSaved(true);
        return;
      }
      showToast({
        variant: "error",
        title: "Couldn't save lesson",
        description: isBackendUnavailable(result.error)
          ? "Saved lessons aren't available right now."
          : result.error.message,
        onRetry: () => void handleSave(),
      });
      return;
    }
    setIsSaved(true);
    showToast({ variant: "success", title: "Lesson saved", description: "Your lesson has been added to Saved Lessons." });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{lesson.topicName}</p>
            </div>
            <p className="font-serif text-base font-medium text-text">{lesson.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LessonProgress percentage={progress} />
          {lessonSessionId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleSave()}
              isLoading={isSaving}
              disabled={isSaved}
              aria-label={isSaved ? "Lesson already saved" : "Save this lesson"}
            >
              {isSaved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onBackToFeed} className="shrink-0">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to feed</span>
            <span className="sm:hidden">Feed</span>
          </Button>
          {isConfirmingNewTopic ? (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-bg px-3 py-1.5 text-xs text-warning">
              <span>Start a new topic? This replaces your current session.</span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  setIsConfirmingNewTopic(false);
                  onNewTopic();
                }}
              >
                Confirm
              </button>
              <button type="button" className="font-medium underline" onClick={() => setIsConfirmingNewTopic(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setIsConfirmingNewTopic(true)}>
              New Topic
            </Button>
          )}
        </div>
      </div>

      {lesson.learningObjectives.length > 0 && (
        <div className="border-b border-border bg-ivory/60 px-4 py-2">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text">Objectives: </span>
            {lesson.learningObjectives.join(" · ")}
          </p>
        </div>
      )}

      <div ref={contentRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4">
        <ListenControls text={lessonSpeechText(lesson)} label="Listen to this lesson" className="mb-4" />
        <LessonRenderer lesson={lesson} />

        {lessonSessionId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-success/30 bg-success-bg p-4">
            <p className="text-sm text-text">
              {completed ? "Lesson complete. Practice it while it's fresh." : "Finished reading? Mark it complete to log your progress."}
            </p>
            {completed ? (
              <Link href={`${routes.learner.practice}?topic=${encodeURIComponent(lesson.topicId)}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">
                Practice this topic
              </Link>
            ) : (
              <Button size="sm" variant="accent" onClick={() => void handleComplete()} isLoading={isCompleting}>
                <CheckCircle2 className="size-4" aria-hidden="true" /> Complete lesson
              </Button>
            )}
          </div>
        )}

        {lesson.nextActivity && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" aria-hidden="true" />
              <p className="text-sm text-text">{lesson.nextActivity.label}</p>
            </div>
            {lesson.nextActivity.type === "practice" && (
              <Link
                href={routes.learner.practice}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
              >
                Practice this concept
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
