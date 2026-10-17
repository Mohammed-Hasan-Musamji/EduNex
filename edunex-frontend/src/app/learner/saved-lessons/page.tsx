"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Search, Trash2, ArrowRight, Calendar, Sparkles, X, BookOpen } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate } from "@/lib/formatters";
import { buildResumeLessonUrl, routes } from "@/lib/routes";
import { savedLessonsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { playClickSound, playHoverTick } from "@/lib/audio-effects";
import { cn } from "@/lib/utils";

interface SavedLessonRow {
  id: string;
  lessonSessionId: string;
  topicName: string;
  lessonTitle: string | null;
  savedAt: string;
}

export function SavedLessonsPage() {
  const { learner } = useLearner();
  const { showToast } = useToast();
  const [savedLessons, setSavedLessons] = useState<SavedLessonRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    if (!learner) return;
    setLoadError(null);
    const result = await savedLessonsApi.list(learner.id);
    if (!result.ok) {
      setLoadError(result.error.message);
      setSavedLessons([]);
      return;
    }
    setSavedLessons(result.data);
  };

  useEffect(() => {
    void load();
  }, [learner?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = savedLessons ?? [];
    if (!query) return list;
    return list.filter(
      (lesson) =>
        lesson.topicName.toLowerCase().includes(query) ||
        (lesson.lessonTitle && lesson.lessonTitle.toLowerCase().includes(query))
    );
  }, [savedLessons, search]);

  const handleRemove = async (lesson: SavedLessonRow) => {
    if (!learner || removingId) return;
    setRemovingId(lesson.id);
    playClickSound();
    const result = await savedLessonsApi.remove(learner.id, lesson.lessonSessionId);
    setRemovingId(null);
    if (!result.ok) {
      showToast({ variant: "error", title: "Couldn't remove lesson", description: result.error.message });
      return;
    }
    setSavedLessons((current) => (current ?? []).filter((l) => l.id !== lesson.id));
    showToast({ variant: "success", title: "Removed from saved lessons", description: lesson.topicName });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs backdrop-blur-xl transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Bookmark className="size-5" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Saved Lessons
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Lessons, concepts, and AI chat sessions you&apos;ve bookmarked to review anytime.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-ivory px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs">
            <Bookmark className="size-3.5 text-primary" />
            {(savedLessons ?? []).length} Saved
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search saved lessons or topics…"
          aria-label="Search saved lessons"
          className="h-11 w-full rounded-2xl border border-border/80 bg-card pl-10 pr-10 text-sm text-text placeholder:text-text-muted shadow-2xs transition-all duration-200 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {savedLessons === null ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-3">
              <div className="h-5 w-40 rounded-md skeleton-shimmer" />
              <div className="h-3 w-28 rounded-md skeleton-shimmer" />
              <div className="h-10 w-full rounded-xl skeleton-shimmer mt-6" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState description={loadError} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={savedLessons.length === 0 ? "No saved lessons yet" : "No saved lessons match your search"}
          description={
            savedLessons.length === 0
              ? "Bookmark a lesson while learning or practicing to resume right where you left off."
              : "Try a different search term to find your saved lesson."
          }
          action={
            savedLessons.length === 0 ? (
              <Link
                href={routes.learner.subjects}
                onMouseEnter={playHoverTick}
                onClick={playClickSound}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all"
              >
                <BookOpen className="size-4" />
                <span>Explore Subjects</span>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lesson) => (
            <li key={lesson.id}>
              <SpotlightCard className="flex h-full flex-col justify-between p-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                      <Bookmark className="size-4 fill-primary/20" />
                    </span>
                    <button
                      type="button"
                      disabled={removingId === lesson.id}
                      onClick={() => void handleRemove(lesson)}
                      onMouseEnter={playHoverTick}
                      aria-label={`Remove ${lesson.topicName} from saved lessons`}
                      className="rounded-xl p-2 text-text-muted hover:bg-error/10 hover:text-error transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <h2 className="font-serif text-lg font-bold tracking-tight text-text">
                      {lesson.lessonTitle ?? lesson.topicName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                      <Calendar className="size-3" />
                      <span>Saved on {formatDate(lesson.savedAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-border/50">
                  <Link
                    href={buildResumeLessonUrl(lesson.lessonSessionId)}
                    onMouseEnter={playHoverTick}
                    onClick={playClickSound}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-center text-sm font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/25"
                  >
                    <span>Resume Lesson</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </SpotlightCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SavedLessonsPage;
