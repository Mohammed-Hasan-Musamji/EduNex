"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { subjectsApi } from "@/lib/api-client";
import { subjectFormSchema, type SubjectFormInput } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import type { Subject } from "@/types/content";

export default function AdminCoursesPage() {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormInput>({ resolver: zodResolver(subjectFormSchema) });

  const load = async () => {
    setLoadError(null);
    const result = await subjectsApi.list(true);
    if (!result.ok) {
      setLoadError(result.error.message);
      setSubjects([]);
      return;
    }
    const detailed = await Promise.all(result.data.map((s) => subjectsApi.getWithTopics(s.id)));
    setSubjects(detailed.map((r, i) => (r.ok ? r.data : result.data[i])));
  };

  useEffect(() => {
    // Initial data fetch on mount -- intentionally sets state once loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = subjects ?? [];
    if (!query) return list;
    return list.filter((subject) => subject.name.toLowerCase().includes(query));
  }, [subjects, search]);

  const onCreate = async (values: SubjectFormInput) => {
    const result = await subjectsApi.create(values);
    if (!result.ok) {
      showToast({
        variant: "error",
        title: "Couldn't create subject",
        description: result.error.kind === "conflict" ? result.error.message : result.error.message,
      });
      return;
    }
    setSubjects((current) => [{ ...result.data, topics: [] }, ...(current ?? [])]);
    showToast({ variant: "success", title: "Subject created", description: `${values.name} was added.` });
    reset();
    setIsFormOpen(false);
  };

  const toggleStatus = async (subject: Subject) => {
    const result = await subjectsApi.update(subject.id, { isActive: !subject.isActive });
    if (!result.ok) {
      showToast({ variant: "error", title: "Couldn't update subject", description: result.error.message });
      return;
    }
    setSubjects((current) => (current ?? []).map((s) => (s.id === subject.id ? { ...s, isActive: result.data.isActive } : s)));
    setConfirmingArchiveId(null);
    showToast({ variant: "success", title: `Subject ${result.data.isActive ? "published" : "archived"}`, description: subject.name });
  };

  return (
    <div>
      <PageHeader
        title="Subject & Course Management"
        description="Organize subjects and topics available to learners."
        actions={
          <Button onClick={() => setIsFormOpen((open) => !open)}>
            <Plus className="size-4" aria-hidden="true" />
            New subject
          </Button>
        }
      />

      {isFormOpen && (
        <form
          onSubmit={handleSubmit(onCreate)}
          noValidate
          className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-white p-4"
        >
          <Input label="Subject name" error={errors.name?.message} {...register("name")} />
          <Textarea label="Description" rows={3} error={errors.description?.message} {...register("description")} />
          <div className="flex gap-2">
            <Button type="submit" isLoading={isSubmitting}>
              Create subject
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search subjects"
          aria-label="Search subjects"
          className="pl-9"
        />
      </div>

      {subjects === null ? (
        <LoadingState label="Loading subjects…" className="mt-6" />
      ) : loadError ? (
        <ErrorState className="mt-6" description={loadError} onRetry={() => void load()} />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filtered.map((subject) => (
            <li key={subject.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-base font-medium text-text">{subject.name}</p>
                    <StatusBadge label={subject.isActive ? "published" : "archived"} tone={subject.isActive ? "success" : "neutral"} />
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{subject.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {subject.topics.map((topic) => (
                      <span key={topic.id} className="rounded-full bg-ivory px-2.5 py-1 text-xs text-text-muted">
                        {topic.name}
                      </span>
                    ))}
                  </div>
                </div>

                {confirmingArchiveId === subject.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">{subject.isActive ? "Archive" : "Publish"} this subject?</span>
                    <button type="button" className="font-medium text-primary underline" onClick={() => void toggleStatus(subject)}>
                      Confirm
                    </button>
                    <button type="button" className="font-medium underline" onClick={() => setConfirmingArchiveId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setConfirmingArchiveId(subject.id)}>
                    {subject.isActive ? "Archive" : "Publish"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
