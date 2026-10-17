import { PageHeader } from "@/components/layout/PageHeader";
import { LearnWorkspace } from "@/components/learner/LearnWorkspace";
import { varkPreferenceSchema } from "@/lib/schemas";
import type { VarkPreference } from "@/types/learner";

interface LearnPageProps {
  searchParams: Promise<{ topic?: string; vark?: string; session?: string }>;
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const params = await searchParams;
  const initialTopicId = params.topic?.trim() || null;
  const initialVarkPreferences: VarkPreference[] = (params.vark ?? "")
    .split(",")
    .map((value) => varkPreferenceSchema.safeParse(value))
    .filter((result): result is { success: true; data: VarkPreference } => result.success)
    .map((result) => result.data);

  return (
    <div>
      <PageHeader
        title="Learn with AI"
        description="Your personalized AI tutor — structured lessons on the whiteboard, with chat alongside."
      />
      <LearnWorkspace
        initialTopicId={initialTopicId}
        initialVarkPreferences={initialVarkPreferences}
        initialLessonSessionId={params.session?.trim() || null}
      />
    </div>
  );
}
