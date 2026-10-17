"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate } from "@/lib/formatters";
import { buildResumeLessonUrl, routes } from "@/lib/routes";
import { savedLessonsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";

interface SavedLessonRow {
  id: string;
  lessonSessionId: string;
  topicName: string;
  lessonTitle: string | null;
  savedAt: string;
}

export default function SavedLessonsPage() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learner?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = savedLessons ?? [];
    if (!query) return list;
    return list.filter((lesson) => lesson.topicName.toLowerCase().includes(query));
  }, [savedLessons, search]);

  const handleRemove = async (lesson: SavedLessonRow) => {
    if (!learner || removingId) return;
    setRemovingId(lesson.id);
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
    <div>
      <PageHeader title="Saved Lessons" description="Lessons you've bookmarked to revisit later." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search saved lessons"
          aria-label="Search saved lessons"
          className="pl-9"
        />
      </div>

      {savedLessons === null ? (
        <LoadingState label="Loading saved lessons…" className="mt-6" />
      ) : loadError ? (
        <ErrorState className="mt-6" description={loadError} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Bookmark}
          title={savedLessons.length === 0 ? "No saved lessons yet" : "No saved lessons match your search"}
          description={savedLessons.length === 0 ? "Bookmark a lesson while learning to find it here later." : undefined}
          action={
            savedLessons.length === 0 ? (
              <Link
                href={routes.learner.subjects}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Explore Subjects
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lesson) => (
            <li key={lesson.id} className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-base font-medium text-text">{lesson.lessonTitle ?? lesson.topicName}</p>
              </div>
              <p className="text-xs text-text-muted">{lesson.topicName} · Saved {formatDate(lesson.savedAt)}</p>
              <div className="mt-auto flex items-center gap-2">
                <Link
                  href={buildResumeLessonUrl(lesson.lessonSessionId)}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Open lesson
                </Link>
                <Button
                  variant="ghost"
                  size="md"
                  isLoading={removingId === lesson.id}
                  onClick={() => void handleRemove(lesson)}
                  aria-label={`Remove ${lesson.topicName} from saved lessons`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
