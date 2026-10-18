"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { VarkPreferenceSelector } from "@/components/learner/VarkPreferenceSelector";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { learnerApi, varkApi } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { VarkQuestionnaire, VarkResult } from "@/types/engagement";
import type { VarkPreference } from "@/types/learner";

const MODALITY_LABELS: Record<string, string> = {
  visual: "Visual",
  auditory: "Aural",
  read_write: "Read/Write",
  kinesthetic: "Kinesthetic",
};

function ScoreBars({ scores, preferred }: { scores: Record<string, number>; preferred: string[] }) {
  const max = Math.max(1, ...Object.values(scores));
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Questionnaire scores">
      {Object.keys(MODALITY_LABELS).map((m) => (
        <li key={m} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className={cn("text-text-muted", preferred.includes(m) && "font-semibold text-text")}>{MODALITY_LABELS[m]}</span>
          <span className="h-2 rounded-full bg-surface-2" aria-hidden="true">
            <span
              className={cn("block h-full rounded-full transition-[width] duration-700", preferred.includes(m) ? "bg-accent" : "bg-border-strong")}
              style={{ width: `${((scores[m] ?? 0) / max) * 100}%` }}
            />
          </span>
          <span className="tabular text-right text-text">{scores[m] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PreferencesPage() {
  const { learner, refresh } = useLearner();
  const { showToast } = useToast();
  const [questionnaire, setQuestionnaire] = useState<VarkQuestionnaire | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<VarkResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [vark, setVark] = useState<VarkPreference[]>([]);
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!learner) return;
    // Seed the editable form from the saved profile once it's loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVark(learner.preferences.varkPreferences);
    setGoal(learner.preferences.learningGoal ?? "");
  }, [learner]);

  useEffect(() => {
    void varkApi.questionnaire().then((res) => (res.ok ? setQuestionnaire(res.data) : setLoadError(res.error.message)));
  }, []);

  const answered = useMemo(() => Object.values(responses).filter((v) => v.length > 0).length, [responses]);

  if (!learner) return <Skeleton className="h-64" />;
  const prefs = learner.preferences;

  const toggle = (questionId: string, optionId: string) =>
    setResponses((r) => {
      const current = r[questionId] ?? [];
      return { ...r, [questionId]: current.includes(optionId) ? current.filter((o) => o !== optionId) : [...current, optionId] };
    });

  const submit = async () => {
    if (!questionnaire) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await varkApi.submit(learner.id, questionnaire.version, responses);
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error.message);
      return;
    }
    setResult(res.data);
    setIsTaking(false);
    setResponses({});
    await refresh();
  };

  const save = async () => {
    setSaving(true);
    const res = await learnerApi.updatePreferences(learner.id, {
      ...prefs,
      varkPreferences: vark,
      learningGoal: goal.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      showToast({ variant: "error", title: "Couldn't save preferences", description: res.error.message });
      return;
    }
    await refresh();
    showToast({ variant: "success", title: "Preferences saved" });
  };

  const provenance =
    prefs.varkSource === "questionnaire"
      ? `From your questionnaire${prefs.varkAssessedAt ? ` on ${formatDate(prefs.varkAssessedAt)}` : ""}.`
      : prefs.varkSource === "self_selected"
        ? "Chosen by you."
        : "Not set yet: lessons use a balanced presentation.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Personalization"
        title="Learning preferences"
        description="These change how lessons and tutor answers are presented: diagrams, spoken-style explanations, written summaries, or worked practice. They never change what is taught or which textbook passages are cited."
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Preference questionnaire</CardTitle>
            <CardDescription className="mt-1">12 everyday situations, about 2 minutes. Pick every answer that fits.</CardDescription>
          </div>
          {!isTaking && (
            <Button variant="secondary" onClick={() => setIsTaking(true)} disabled={!questionnaire}>
              <ClipboardList className="size-4" aria-hidden="true" />
              {prefs.varkSource === "questionnaire" ? "Retake" : "Start"}
            </Button>
          )}
        </div>

        {loadError && <ErrorState className="mt-4" description={loadError} />}

        {(result || prefs.varkScores) && !isTaking && (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScoreBars scores={result?.scores ?? prefs.varkScores ?? {}} preferred={result?.preferred ?? prefs.varkPreferences} />
            <p className="text-sm text-text-muted">{result?.explanation ?? provenance}</p>
          </div>
        )}

        {isTaking && questionnaire && (
          <form
            className="mt-5 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="rounded-md bg-surface-2 p-3 text-xs text-text-muted">{questionnaire.disclaimer}</p>
            {questionnaire.questions.map((q, qi) => (
              <fieldset key={q.id}>
                <legend className="text-sm font-medium text-text">
                  {qi + 1}. {q.prompt}
                </legend>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((o) => {
                    const checked = (responses[q.id] ?? []).includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                          checked ? "border-accent bg-accent-soft text-text" : "border-border bg-card hover:bg-ivory",
                        )}
                      >
                        <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={checked} onChange={() => toggle(q.id, o.id)} />
                        {o.text}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            {submitError && (
              <p role="alert" className="text-sm text-error">
                {submitError}
              </p>
            )}
            <div className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/95 p-3 shadow-md backdrop-blur lg:bottom-4">
              <span className="text-sm text-text-muted">
                {answered}/{questionnaire.questions.length} answered (at least {questionnaire.minAnswered})
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsTaking(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting} disabled={answered < questionnaire.minAnswered}>
                  See my results
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Your settings</CardTitle>
        <CardDescription className="mt-1">{provenance} You can override the result at any time.</CardDescription>
        <div className="mt-5 flex flex-col gap-5">
          <VarkPreferenceSelector value={vark} onChange={setVark} />
          <Textarea
            label="Learning goal (optional)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Get comfortable with SQL joins before my DBMS exam"
          />
          <div>
            <Button onClick={() => void save()} isLoading={saving}>
              <Save className="size-4" aria-hidden="true" />
              Save preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
