"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SubjectCard } from "@/components/learner/SubjectCard";
import { VarkPreferenceSelector } from "@/components/learner/VarkPreferenceSelector";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { demoSubjects } from "@/lib/demo-data";
import { startLearningSchema } from "@/lib/schemas";
import { subjectsApi, learnerApi } from "@/lib/api-client";
import { buildLearnUrl } from "@/lib/routes";
import { useLearningSession } from "@/hooks/use-learning-session";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import type { VarkPreference } from "@/types/learner";
import type { Subject } from "@/types/content";

export default function SubjectsPage() {
  const router = useRouter();
  const { startSession } = useLearningSession();
  const { learner } = useLearner();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubjects();
  }, []);

  const realIds = new Set((realSubjects ?? []).map((s) => s.slug));
  const allSubjects: Array<Subject & { isDemo: boolean }> = [
    ...(realSubjects ?? []).map((s) => ({ ...s, isDemo: false })),
    ...demoSubjects.filter((s) => !realIds.has(s.slug)).map((s) => ({ ...s, isDemo: true })),
  ];

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allSubjects;
    return allSubjects.filter(
      (subject) => subject.name.toLowerCase().includes(query) || subject.description.toLowerCase().includes(query),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, realSubjects]);

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

    const topic = selectedSubject?.topics.find((t) => t.id === parsed.data.topicId);
    const topicName = topic?.name ?? parsed.data.topicId;

    if (learner && parsed.data.varkPreferences.length > 0) {
      const prefResult = await learnerApi.updatePreferences(learner.id, {
        ...learner.preferences,
        varkPreferences: parsed.data.varkPreferences,
      });
      if (prefResult.ok) {
        showToast({ variant: "success", title: "Preferences updated", description: "Your learning preferences have been saved." });
      }
    }

    startSession(parsed.data.topicId, topicName, parsed.data.varkPreferences);
    // Note: `sessionId` here would be a local (non-backend) id -- the `session`
    // query param is reserved for resuming a *real* backend lesson_session_id
    // (see buildResumeLessonUrl, used by Saved Lessons). A fresh topic start
    // only needs `topic`/`vark`; LearnWorkspace creates the real session itself.
    router.push(buildLearnUrl({ topicId: parsed.data.topicId, vark: parsed.data.varkPreferences }));
  };

  return (
    <div>
      <PageHeader
        title="Explore Subjects"
        description="Pick a topic and tell us how you learn best, then start a personalized lesson."
      />

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search subjects, e.g. “data structures”"
          aria-label="Search subjects"
          className="pl-9"
        />
      </div>

      {realSubjects === null ? (
        <LoadingState label="Loading subjects…" className="mt-6" />
      ) : loadError ? (
        <ErrorState className="mt-6" description={loadError} onRetry={() => void loadSubjects()} />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No subjects match your search"
          description="Try a different keyword, or clear the search to see all subjects."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              isDemo={subject.isDemo}
              isSelected={subject.id === selectedSubjectId}
              onSelect={() => handleSelectSubject(subject.id)}
            />
          ))}
        </div>
      )}

      {selectedSubject && (
        <div className="mt-8 rounded-lg border border-border bg-white p-5">
          <h2 className="font-serif text-lg font-medium text-text">{selectedSubject.name} — choose a topic</h2>
          {selectedSubject.topics.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No topics yet for this subject.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSubject.topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={topic.id === selectedTopicId}
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setTopicError(null);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    topic.id === selectedTopicId
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-text hover:bg-ivory"
                  }`}
                >
                  {topic.name}
                  <span className="ml-1.5 text-xs opacity-70">· {topic.difficulty}</span>
                </button>
              ))}
            </div>
          )}
          {topicError && (
            <p className="mt-2 text-xs text-error" role="alert">
              {topicError}
            </p>
          )}

          <div className="mt-6">
            <VarkPreferenceSelector value={varkPreferences} onChange={setVarkPreferences} />
          </div>

          <Button
            onClick={handleStartLearning}
            isLoading={isStarting}
            disabled={selectedSubject.topics.length === 0}
            className="mt-6"
          >
            Start Learning
          </Button>
        </div>
      )}
    </div>
  );
}
