"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
} from "lucide-react";
import { SubjectCard } from "@/components/learner/SubjectCard";
import { VarkPreferenceSelector } from "@/components/learner/VarkPreferenceSelector";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { startLearningSchema } from "@/lib/schemas";
import { subjectsApi, learnerApi } from "@/lib/api-client";
import { buildLearnUrl } from "@/lib/routes";
import { useLearningSession } from "@/hooks/use-learning-session";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { playClickSound, playHoverTick, playSuccessChime } from "@/lib/audio-effects";
import type { VarkPreference } from "@/types/learner";
import type { Subject } from "@/types/content";
import { cn } from "@/lib/utils";

export default function SubjectsPage() {
  const router = useRouter();
  const { startSession } = useLearningSession();
  const { learner } = useLearner();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [realSubjects, setRealSubjects] = useState<Subject[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [varkPreferences, setVarkPreferences] = useState<VarkPreference[]>([]);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const loadSubjects = async () => {
    setLoadError(null);
    setRealSubjects(null);
    const listResult = await subjectsApi.list();
    if (!listResult.ok) {
      setLoadError(listResult.error.message);
      setRealSubjects([]);
      return;
    }
    const detailed = await Promise.all(listResult.data.map((s) => subjectsApi.getWithTopics(s.id)));
    setRealSubjects(detailed.map((r, i) => (r.ok ? r.data : listResult.data[i])));
  };

  useEffect(() => {
    void loadSubjects();
  }, []);

  const allSubjects: Subject[] = realSubjects ?? [];

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = allSubjects;

    if (selectedCategory === "Computer Science") {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes("data structure") ||
          s.name.toLowerCase().includes("computer science") ||
          s.name.toLowerCase().includes("operating system") ||
          s.name.toLowerCase().includes("database")
      );
    } else if (selectedCategory === "Sciences") {
      result = result.filter(
        (s) => s.name.toLowerCase().includes("physics") || s.name.toLowerCase().includes("chemistry")
      );
    } else if (selectedCategory === "Math") {
      result = result.filter((s) => s.name.toLowerCase().includes("calculus"));
    }

    if (!query) return result;
    return result.filter(
      (subject) =>
        subject.name.toLowerCase().includes(query) || subject.description.toLowerCase().includes(query)
    );
  }, [search, selectedCategory, allSubjects]);

  const selectedSubject = allSubjects.find((subject) => subject.id === selectedSubjectId) ?? null;

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId(null);
    setTopicError(null);
  };

  const handleStartLearning = async () => {
    const parsed = startLearningSchema.safeParse({ topicId: selectedTopicId ?? "", varkPreferences });
    if (!parsed.success) {
      setTopicError(parsed.error.issues[0]?.message ?? "Select a topic to continue");
      return;
    }
    if (isStarting) return;
    setIsStarting(true);
    playClickSound();

    const topic = selectedSubject?.topics.find((t) => t.id === parsed.data.topicId);
    const topicName = topic?.name ?? parsed.data.topicId;

    if (learner && parsed.data.varkPreferences.length > 0) {
      const prefResult = await learnerApi.updatePreferences(learner.id, {
        ...learner.preferences,
        varkPreferences: parsed.data.varkPreferences,
      });
      if (prefResult.ok) {
        showToast({
          variant: "success",
          title: "Preferences updated",
          description: "Your learning preferences have been saved.",
        });
      }
    }

    startSession(parsed.data.topicId, topicName, parsed.data.varkPreferences);
    playSuccessChime();
    router.push(buildLearnUrl({ topicId: parsed.data.topicId, vark: parsed.data.varkPreferences }));
  };

  const categories = ["All", "Computer Science", "Sciences", "Math"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs backdrop-blur-xl transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <BookOpen className="size-5" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Explore Subjects
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Pick a subject and topic, select your sensory VARK style, and start an AI-adapted session.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-ivory px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            {allSubjects.length} Subjects Ready
          </span>
        </div>
      </div>

      {/* Search Bar & Category Filter Chips */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects, e.g. “data structures”…"
            aria-label="Search subjects"
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

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onMouseEnter={playHoverTick}
                onClick={() => {
                  playClickSound();
                  setSelectedCategory(cat);
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                  isSelected
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "border border-border/80 bg-card text-text-muted hover:border-primary/40 hover:text-text hover:bg-ivory"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subjects Grid or Shimmer Loading Skeleton */}
      {realSubjects === null ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="size-11 rounded-2xl skeleton-shimmer" />
                <div className="h-5 w-14 rounded-full skeleton-shimmer" />
              </div>
              <div className="h-5 w-36 rounded-md skeleton-shimmer mt-3" />
              <div className="h-3 w-full rounded-md skeleton-shimmer" />
              <div className="h-3 w-4/5 rounded-md skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState description={loadError} onRetry={() => void loadSubjects()} />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title="No subjects match your search"
          description="Try a different keyword or category, or clear search to view all subjects."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              isSelected={subject.id === selectedSubjectId}
              onSelect={() => handleSelectSubject(subject.id)}
            />
          ))}
        </div>
      )}

      {/* Interactive Topic Selection & Session Launcher Drawer */}
      {selectedSubject && (
        <div className="mt-8 rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-xl shadow-primary/10 backdrop-blur-xl animate-fade-scale">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Step 2: Choose Topic</span>
              <h2 className="font-serif text-xl font-bold tracking-tight text-text">
                {selectedSubject.name} — Select a Topic
              </h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {selectedSubject.topics.length} topics available
            </span>
          </div>

          {selectedSubject.topics.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">No topics published yet for this subject.</p>
          ) : (
            <div className="mt-4">
              <p className="text-xs font-medium text-text-muted mb-2.5">Available Topics & Difficulty:</p>
              <div className="flex flex-wrap gap-2.5">
                {selectedSubject.topics.map((topic) => {
                  const isSelected = topic.id === selectedTopicId;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      aria-pressed={isSelected}
                      onMouseEnter={playHoverTick}
                      onClick={() => {
                        playClickSound();
                        setSelectedTopicId(topic.id);
                        setTopicError(null);
                      }}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                          : "border-border/80 bg-card text-text hover:border-primary/40 hover:bg-ivory hover:-translate-y-0.5"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="size-4 text-white animate-badge-pop" />}
                      <span>{topic.name}</span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          isSelected ? "bg-white/20 text-white" : "bg-ivory text-text-muted border border-border/60"
                        )}
                      >
                        {topic.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {topicError && (
            <p className="mt-3 text-xs font-semibold text-error animate-shake" role="alert">
              ⚠️ {topicError}
            </p>
          )}

          {/* VARK Preferences */}
          <div className="mt-6 border-t border-border/60 pt-5">
            <VarkPreferenceSelector value={varkPreferences} onChange={setVarkPreferences} />
          </div>

          {/* Launch Session Button */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
            <p className="text-xs text-text-muted">
              {selectedTopicId
                ? "✨ Ready to launch an interactive, multimodal session tailored to your profile."
                : "Select a topic above to begin learning."}
            </p>

            <button
              type="button"
              onClick={handleStartLearning}
              disabled={isStarting || selectedSubject.topics.length === 0}
              onMouseEnter={playHoverTick}
              className={cn(
                "group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-hover px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 active:scale-95",
                (!selectedTopicId || isStarting) && "opacity-60 pointer-events-none"
              )}
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                aria-hidden="true"
              />
              <Sparkles className="size-4 transition-transform group-hover:rotate-12" />
              <span>{isStarting ? "Initializing Session…" : "Start Learning"}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
