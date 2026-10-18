import type { ZodType } from "zod";
import { ApiError, type ApiResult } from "@/types/api";
import {
  learnerBackendSchema,
  adminUserBackendSchema,
  subjectBackendSchema,
  subjectDetailBackendSchema,
  topicBackendSchema,
  lessonSessionBackendSchema,
  lessonChatBackendSchema,
  lessonSessionSummaryBackendSchema,
  savedLessonBackendSchema,
  questionPublicBackendSchema,
  attemptResultBackendSchema,
  practiceQuestionGenerationBackendSchema,
  attemptReadBackendSchema,
  progressBackendSchema,
  recommendationBackendSchema,
  documentBackendSchema,
  ingestResponseBackendSchema,
  searchResponseBackendSchema,
  gamificationSummaryBackendSchema,
  timelineEventBackendSchema,
  analyticsBackendSchema,
  practiceRoundResultBackendSchema,
  lessonCompletionBackendSchema,
  diagnosticStateBackendSchema,
  diagnosticAnswerResultBackendSchema,
  diagnosticListItemBackendSchema,
  notificationBackendSchema,
  notificationListBackendSchema,
  tutorAnswerBackendSchema,
  subjectDocumentBackendSchema,
  skillProfileBackendSchema,
  varkQuestionnaireBackendSchema,
  varkResultBackendSchema,
  learningPlanBackendSchema,
} from "@/lib/backend-schemas";
import type { LearningPlan, SkillProfile, SubjectDocument, TutorAnswer, VarkQuestionnaire, VarkResult } from "@/types/engagement";
import {
  mapLearner,
  mapAdminUser,
  mapSubject,
  mapSubjectDetail,
  mapTopic,
  mapLessonSession,
  mapLesson,
  mapLessonSummary,
  mapSavedLesson,
  mapQuestion,
  mapProgress,
  mapRecommendation,
  mapDocument,
  mapSearchResponse,
  mapGamification,
  mapTimelineEvent,
  mapAnalytics,
  mapPracticeRound,
  mapRewards,
  mapDiagnosticState,
  mapDiagnosticListItem,
  mapNotification,
} from "@/lib/api-mappers";
import type { VarkPreference, LearnerPreferences, UserRole } from "@/types/learner";
import type { ChatMessage } from "@/types/lesson";
import { z } from "zod";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 15_000;

interface RequestOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  schema?: ZodType<T>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const backendErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.array(z.unknown()).optional() }),
});

function buildUrl(path: string, query?: RequestOptions<unknown>["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Centralized FastAPI client. Every feature must route requests through this
 * module instead of calling fetch() directly, so error handling, timeouts,
 * and response validation stay consistent across the app.
 */
export async function apiRequest<T>(path: string, options: RequestOptions<T> = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, schema, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: body && !isFormData ? { "Content-Type": "application/json" } : undefined,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: new ApiError("timeout", "The request timed out. Please try again.") };
    }
    return {
      ok: false,
      error: new ApiError("network", "Could not reach the EduNex server. Check your connection."),
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    // The backend always returns {"error": {"code","message","details"}} —
    // surface its real message instead of a generic one where possible.
    let backendMessage: string | undefined;
    let backendCode: string | undefined;
    try {
      const body = await response.json();
      const parsed = backendErrorEnvelopeSchema.safeParse(body);
      if (parsed.success) {
        backendMessage = parsed.data.error.message;
        backendCode = parsed.data.error.code;
      }
    } catch {
      // Non-JSON error body (e.g. a proxy error page) -- fall through to generic handling.
    }

    if (response.status === 401) {
      return { ok: false, error: new ApiError("unauthorized", backendMessage ?? "Please sign in to continue.", 401) };
    }
    if (response.status === 403) {
      return {
        ok: false,
        error: new ApiError("forbidden", backendMessage ?? "You do not have permission to do that.", 403),
      };
    }
    if (response.status === 404) {
      // Our own NotFoundError envelope uses code "NOT_FOUND" for a genuinely
      // missing resource. Any other 404 (e.g. FastAPI's default for an
      // unmapped path) means the route itself isn't implemented.
      const kind = backendCode === "NOT_FOUND" ? "not_found" : "not_implemented";
      return { ok: false, error: new ApiError(kind, backendMessage ?? "That resource was not found.", 404) };
    }
    if (response.status === 409) {
      return { ok: false, error: new ApiError("conflict", backendMessage ?? "That already exists.", 409) };
    }
    if (response.status === 422) {
      return {
        ok: false,
        error: new ApiError("http", backendMessage ?? "The request could not be validated.", 422),
      };
    }
    if (response.status === 503) {
      return {
        ok: false,
        error: new ApiError("service_unavailable", backendMessage ?? "This service is temporarily unavailable.", 503),
      };
    }
    return {
      ok: false,
      error: new ApiError("http", backendMessage ?? `Request failed with status ${response.status}.`, response.status),
    };
  }

  let json: unknown;
  try {
    json = response.status === 204 ? null : await response.json();
  } catch {
    return { ok: false, error: new ApiError("invalid_json", "The server returned an unreadable response.") };
  }

  if (schema) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        error: new ApiError("invalid_shape", "The server response did not match the expected format."),
      };
    }
    return { ok: true, data: parsed.data };
  }

  return { ok: true, data: json as T };
}

const readinessSchema = z.object({
  status: z.enum(["ready", "degraded"]),
  dependencies: z.object({
    database: z.object({ ok: z.boolean(), detail: z.string() }),
    gemini: z.object({ configured: z.boolean(), detail: z.string() }),
  }),
});

export const healthApi = {
  readiness: () => apiRequest("/api/v1/health/ready", { schema: readinessSchema }),
};

<<<<<<< HEAD
export const authApi = {
  login: async (input: { email: string; password: string }) => {
    const result = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: input,
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
  register: async (input: { displayName: string; email: string; password: string }) => {
    const result = await apiRequest("/api/v1/auth/register", {
      method: "POST",
      body: {
        display_name: input.displayName,
        email: input.email,
        password: input.password,
      },
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
  logout: async () => {
    return apiRequest("/api/v1/auth/logout", {
      method: "POST",
    });
  },
  me: async () => {
    const result = await apiRequest("/api/v1/auth/me", {
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
};

export const learnerApi = {
  create: async (displayName: string) => {
    const result = await apiRequest("/api/v1/learners", {
=======
// ---------------------------------------------------------------------------
// Auth -- sessions are a signed JWT in an httpOnly cookie (see
// backend/app/api/routes/auth.py). The frontend never reads or stores the
// token itself; every authenticated request just needs credentials: "include"
// (already set in apiRequest above).
// ---------------------------------------------------------------------------

export const authApi = {
  register: async (input: { displayName: string; email: string; password: string }) => {
    const result = await apiRequest("/api/v1/auth/register", {
>>>>>>> b5abe61 (Implemented 3)
      method: "POST",
      body: { display_name: input.displayName, email: input.email, password: input.password },
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
<<<<<<< HEAD
  get: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}`, { schema: learnerBackendSchema });
    if (!result.ok && result.error.kind === "unauthorized") {
      const resumeResult = await apiRequest(`/api/v1/learners/${learnerId}/resume`, {
        method: "POST",
        schema: learnerBackendSchema,
      });
      return resumeResult.ok ? { ok: true as const, data: mapLearner(resumeResult.data) } : resumeResult;
    }
=======
  login: async (input: { email: string; password: string }) => {
    const result = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: { email: input.email, password: input.password },
      schema: learnerBackendSchema,
    });
>>>>>>> b5abe61 (Implemented 3)
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
  logout: () => apiRequest("/api/v1/auth/logout", { method: "POST" }),
  me: async () => {
    const result = await apiRequest("/api/v1/auth/me", { schema: learnerBackendSchema });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
};

export const learnerApi = {
  /** Replaces the editable preferences; the server keeps VARK provenance/scores itself. */
  updatePreferences: async (learnerId: string, preferences: LearnerPreferences) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/preferences`, {
      method: "PUT",
      body: {
        vark_preferences: preferences.varkPreferences,
        preferred_detail: preferences.preferredDetail ?? null,
        learning_goal: preferences.learningGoal ?? null,
      },
    });
    return result;
  },
  /** Start or defer onboarding. `completed` is set by the server only. */
  updateOnboarding: async (learnerId: string, status: "in_progress" | "skipped") => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/onboarding`, {
      method: "PUT",
      body: { status },
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
};

// ---------------------------------------------------------------------------
// Subjects & topics -- fully implemented and real.
// ---------------------------------------------------------------------------

export const subjectsApi = {
  list: async (includeInactive = false) => {
    const result = await apiRequest(`/api/v1/subjects`, {
      query: { include_inactive: includeInactive },
      schema: z.array(subjectBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapSubject) } : result;
  },
  getWithTopics: async (subjectId: string) => {
    const result = await apiRequest(`/api/v1/subjects/${subjectId}`, { schema: subjectDetailBackendSchema });
    return result.ok ? { ok: true as const, data: mapSubjectDetail(result.data) } : result;
  },
  create: async (input: { name: string; description: string }) => {
    const result = await apiRequest("/api/v1/admin/subjects", {
      method: "POST",
      body: input,
      schema: subjectBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapSubject(result.data) } : result;
  },
  update: async (subjectId: string, input: { name?: string; description?: string; isActive?: boolean }) => {
    const result = await apiRequest(`/api/v1/admin/subjects/${subjectId}`, {
      method: "PATCH",
      body: { name: input.name, description: input.description, is_active: input.isActive },
      schema: subjectBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapSubject(result.data) } : result;
  },
};

export const catalogApi = {
  /** Indexed textbook chapters for a subject -- what the tutor can actually search. */
  documents: async (subjectId: string) => {
    const result = await apiRequest(`/api/v1/subjects/${subjectId}/documents`, { schema: z.array(subjectDocumentBackendSchema) });
    return result.ok
      ? {
          ok: true as const,
          data: result.data.map(
            (d): SubjectDocument => ({
              id: d.id,
              title: d.title,
              topicId: d.topic_id,
              chapterNumber: d.chapter_number,
              pageCount: d.page_count,
              chunkCount: d.chunk_count,
            }),
          ),
        }
      : result;
  },
};

export const topicsApi = {
  get: async (topicId: string) => {
    const result = await apiRequest(`/api/v1/topics/${topicId}`, { schema: topicBackendSchema });
    return result.ok ? { ok: true as const, data: mapTopic(result.data) } : result;
  },
};

// ---------------------------------------------------------------------------
// Lesson sessions -- real Gemini-backed generation, grounded in retrieval.
// ---------------------------------------------------------------------------

export const lessonsApi = {
  create: async (input: { topicId: string; prompt: string; varkPreferences: VarkPreference[] }) => {
    const result = await apiRequest("/api/v1/lessons", {
      method: "POST",
      body: {
        topic_id: input.topicId,
        prompt: input.prompt,
        vark_preferences: input.varkPreferences,
      },
      schema: lessonSessionBackendSchema,
      timeoutMs: 45_000, // lesson generation can take a while
    });
    return result.ok ? { ok: true as const, data: mapLessonSession(result.data) } : result;
  },
  get: async (lessonId: string) => {
    const result = await apiRequest(`/api/v1/lessons/${lessonId}`, { schema: lessonSessionBackendSchema });
    return result.ok ? { ok: true as const, data: mapLessonSession(result.data) } : result;
  },
  chat: async (
    lessonId: string,
    question: string,
    history: Pick<ChatMessage, "role" | "content">[],
  ) => {
    return apiRequest(`/api/v1/lessons/${lessonId}/chat`, {
      method: "POST",
      body: { question, history },
      schema: lessonChatBackendSchema,
      timeoutMs: 90_000,
    }).then((result) =>
      result.ok
        ? { ok: true as const, data: { answer: result.data.answer, lesson: result.data.lesson ? mapLesson(result.data.lesson) : null } }
        : result,
    );
  },
  resume: async (lessonId: string) => {
    const result = await apiRequest(`/api/v1/lessons/${lessonId}/resume`, {
      method: "POST",
      schema: lessonSessionBackendSchema,
      timeoutMs: 45_000,
    });
    return result.ok ? { ok: true as const, data: mapLessonSession(result.data) } : result;
  },
  /** Marks a generated lesson finished; the server awards XP at most once. */
  complete: async (lessonId: string) => {
    const result = await apiRequest(`/api/v1/lessons/${lessonId}/complete`, {
      method: "POST",
      schema: lessonCompletionBackendSchema,
    });
    return result.ok
      ? {
          ok: true as const,
          data: {
            completedAt: result.data.completed_at,
            alreadyCompleted: result.data.already_completed,
            rewards: result.data.rewards ? mapRewards(result.data.rewards) : null,
          },
        }
      : result;
  },
  listForLearner: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/lessons`, {
      schema: z.array(lessonSessionSummaryBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapLessonSummary) } : result;
  },
};

// ---------------------------------------------------------------------------
// Saved lessons
// ---------------------------------------------------------------------------

export const savedLessonsApi = {
  save: async (learnerId: string, lessonSessionId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/saved-lessons/${lessonSessionId}`, {
      method: "POST",
      schema: savedLessonBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapSavedLesson(result.data) } : result;
  },
  list: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/saved-lessons`, {
      schema: z.array(savedLessonBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapSavedLesson) } : result;
  },
  remove: async (learnerId: string, lessonSessionId: string) =>
    apiRequest(`/api/v1/learners/${learnerId}/saved-lessons/${lessonSessionId}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Assessments -- multiple_choice and true_false are evaluated server-side.
// ---------------------------------------------------------------------------

export const assessmentsApi = {
  generateQuestions: async (topicId: string) => {
    return apiRequest(`/api/v1/topics/${topicId}/questions/generate`, {
      method: "POST",
      schema: practiceQuestionGenerationBackendSchema,
      timeoutMs: 90_000,
    });
  },
  listQuestions: async (topicId: string, limit?: number) => {
    const result = await apiRequest(`/api/v1/topics/${topicId}/questions`, {
      query: { limit },
      schema: z.array(questionPublicBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapQuestion) } : result;
  },
  submitAttempt: async (input: { questionId: string; submittedAnswer: number | boolean }) => {
    const result = await apiRequest("/api/v1/assessments/attempts", {
      method: "POST",
      body: { question_id: input.questionId, submitted_answer: input.submittedAnswer },
      schema: attemptResultBackendSchema,
    });
    return result.ok
      ? {
          ok: true as const,
          data: {
            attemptId: result.data.attempt_id,
            questionId: result.data.question_id,
            isCorrect: result.data.is_correct,
            score: result.data.score,
            feedback: result.data.feedback,
            explanation: result.data.explanation,
          },
        }
      : result;
  },
  /**
   * Submits a whole practice round; the server grades it and awards rewards.
   * `clientRequestId` must be stable across retries of the same submission
   * so a retry replays the stored result instead of double-recording it.
   */
  submitRound: async (input: {
    topicId: string;
    clientRequestId: string;
    answers: { questionId: string; submittedAnswer: number | boolean }[];
  }) => {
    const result = await apiRequest("/api/v1/assessments/rounds", {
      method: "POST",
      body: {
        topic_id: input.topicId,
        client_request_id: input.clientRequestId,
        answers: input.answers.map((a) => ({ question_id: a.questionId, submitted_answer: a.submittedAnswer })),
      },
      schema: practiceRoundResultBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapPracticeRound(result.data) } : result;
  },
  listAttempts: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/assessments`, {
      schema: z.array(attemptReadBackendSchema),
    });
    return result.ok
      ? {
          ok: true as const,
          data: result.data.map((a) => ({
            id: a.id,
            questionId: a.question_id,
            submittedAnswer: a.submitted_answer,
            isCorrect: a.is_correct,
            score: a.score,
            feedback: a.feedback,
            createdAt: a.created_at,
          })),
        }
      : result;
  },
};

// ---------------------------------------------------------------------------
// Progress & recommendations
// ---------------------------------------------------------------------------

export const progressApi = {
  list: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/progress`, {
      schema: z.array(progressBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapProgress) } : result;
  },
  getForTopic: async (learnerId: string, topicId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/progress/${topicId}`, {
      schema: progressBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapProgress(result.data) } : result;
  },
  recommendations: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/recommendations`, {
      schema: z.array(recommendationBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapRecommendation) } : result;
  },
};

// ---------------------------------------------------------------------------
// Gamification, analytics & timeline -- all computed server-side.
// ---------------------------------------------------------------------------

export const learningApi = {
  gamification: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/gamification`, {
      schema: gamificationSummaryBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapGamification(result.data) } : result;
  },
  analytics: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/analytics`, { schema: analyticsBackendSchema });
    return result.ok ? { ok: true as const, data: mapAnalytics(result.data) } : result;
  },
  timeline: async (learnerId: string, limit = 30) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/timeline`, {
      query: { limit },
      schema: z.array(timelineEventBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapTimelineEvent) } : result;
  },
};

// ---------------------------------------------------------------------------
// Textbook tutor (grounded RAG answers), skill profile, VARK, learning plan.
// ---------------------------------------------------------------------------

export const tutorApi = {
  ask: async (input: { question: string; subjectId?: string; documentId?: string }) => {
    const result = await apiRequest("/api/v1/tutor/ask", {
      method: "POST",
      body: { question: input.question, subject_id: input.subjectId || undefined, document_id: input.documentId || undefined },
      schema: tutorAnswerBackendSchema,
      timeoutMs: 45_000,
    });
    if (!result.ok) return result;
    const d = result.data;
    const data: TutorAnswer = {
      interactionId: d.interaction_id,
      answer: d.answer,
      grounded: d.grounded,
      support: d.support,
      retrieved: d.retrieval.retrieved,
      personalization: { varkPreferences: d.personalization.vark_preferences, explanation: d.personalization.explanation },
      sources: d.sources.map((s) => ({
        ref: s.ref,
        chunkId: s.chunk_id,
        documentId: s.document_id,
        title: s.title,
        subject: s.subject,
        chapter: s.chapter,
        section: s.section,
        sourceFile: s.source_file,
        pageStart: s.page_start,
        pageEnd: s.page_end,
        similarity: s.similarity,
        excerpt: s.excerpt,
      })),
    };
    return { ok: true as const, data };
  },
};

export const skillsApi = {
  profile: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/skill-profile`, { schema: skillProfileBackendSchema });
    if (!result.ok) return result;
    const data: SkillProfile = {
      method: result.data.method,
      topics: result.data.topics.map((t) => ({
        topicId: t.topic_id,
        topicName: t.topic_name,
        subjectName: t.subject_name,
        difficulty: t.difficulty,
        attempts: t.attempts,
        correct: t.correct,
        measuredAccuracy: t.measured_accuracy,
        estimatedMastery: t.estimated_mastery,
        uncertainty: t.uncertainty,
        evidenceLevel: t.evidence_level,
        lastAssessedAt: t.last_assessed_at,
        changeSinceFirst: t.change_since_first_snapshot,
        misconceptions: t.misconceptions.map((m) => ({
          questionId: m.question_id,
          questionText: m.question_text,
          timesMissed: m.times_missed,
          explanation: m.explanation,
        })),
      })),
    };
    return { ok: true as const, data };
  },
  learningPlan: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/learning-plan`, { schema: learningPlanBackendSchema });
    if (!result.ok) return result;
    const data: LearningPlan = {
      varkPreferences: result.data.vark_preferences,
      varkSource: result.data.vark_source,
      note: result.data.note,
      items: result.data.items.map((i) => ({
        topicId: i.topic_id,
        topicName: i.topic_name,
        difficulty: i.difficulty,
        label: i.label,
        reason: i.reason,
        activities: i.activities,
      })),
    };
    return { ok: true as const, data };
  },
};

export const varkApi = {
  questionnaire: async () => {
    const result = await apiRequest("/api/v1/vark/questionnaire", { schema: varkQuestionnaireBackendSchema });
    if (!result.ok) return result;
    const data: VarkQuestionnaire = { ...result.data, minAnswered: result.data.min_answered };
    return { ok: true as const, data };
  },
  submit: async (learnerId: string, version: string, responses: Record<string, string[]>) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/vark-assessments`, {
      method: "POST",
      body: { version, responses },
      schema: varkResultBackendSchema,
    });
    if (!result.ok) return result;
    const data: VarkResult = {
      id: result.data.id,
      scores: result.data.scores,
      preferred: result.data.preferred,
      explanation: result.data.explanation,
      createdAt: result.data.created_at,
    };
    return { ok: true as const, data };
  },
};

// ---------------------------------------------------------------------------
// Adaptive diagnostics -- one server-chosen question at a time.
// ---------------------------------------------------------------------------

export const diagnosticsApi = {
  /** Starts a diagnostic, or resumes the in-progress one for this subject. */
  start: async (subjectId: string) => {
    const result = await apiRequest("/api/v1/diagnostics", {
      method: "POST",
      body: { subject_id: subjectId },
      schema: diagnosticStateBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapDiagnosticState(result.data) } : result;
  },
  get: async (diagnosticId: string) => {
    const result = await apiRequest(`/api/v1/diagnostics/${diagnosticId}`, { schema: diagnosticStateBackendSchema });
    return result.ok ? { ok: true as const, data: mapDiagnosticState(result.data) } : result;
  },
  answer: async (diagnosticId: string, input: { questionId: string; submittedAnswer: number | boolean }) => {
    const result = await apiRequest(`/api/v1/diagnostics/${diagnosticId}/answers`, {
      method: "POST",
      body: { question_id: input.questionId, submitted_answer: input.submittedAnswer },
      schema: diagnosticAnswerResultBackendSchema,
    });
    return result.ok
      ? {
          ok: true as const,
          data: {
            attempt: {
              isCorrect: result.data.attempt.is_correct,
              feedback: result.data.attempt.feedback,
              explanation: result.data.attempt.explanation,
              questionId: result.data.attempt.question_id,
            },
            state: mapDiagnosticState(result.data.state),
            rewards: result.data.rewards ? mapRewards(result.data.rewards) : null,
          },
        }
      : result;
  },
  listForLearner: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}/diagnostics`, {
      schema: z.array(diagnosticListItemBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapDiagnosticListItem) } : result;
  },
};

// ---------------------------------------------------------------------------
// Notifications -- always the authenticated user's own.
// ---------------------------------------------------------------------------

export const notificationsApi = {
  list: async (options: { unreadOnly?: boolean; limit?: number } = {}) => {
    const result = await apiRequest("/api/v1/notifications", {
      query: { unread_only: options.unreadOnly, limit: options.limit },
      schema: notificationListBackendSchema,
    });
    return result.ok
      ? { ok: true as const, data: { items: result.data.items.map(mapNotification), unreadCount: result.data.unread_count } }
      : result;
  },
  markRead: async (notificationId: string) => {
    const result = await apiRequest(`/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
      schema: notificationBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapNotification(result.data) } : result;
  },
  markAllRead: () => apiRequest("/api/v1/notifications/read-all", { method: "POST" }),
};

// ---------------------------------------------------------------------------
// Admin: Knowledge Base -- fully implemented and real (development-only,
// no authentication enforced; see backend/README.md).
// ---------------------------------------------------------------------------

export const adminKnowledgeBaseApi = {
  listDocuments: async () => {
    const result = await apiRequest("/api/v1/admin/knowledge-base/documents", {
      schema: z.array(documentBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapDocument) } : result;
  },
  createFromText: async (input: { title: string; sourceName?: string; contentType: "text" | "markdown"; subjectId?: string; text: string }) => {
    const result = await apiRequest("/api/v1/admin/knowledge-base/documents", {
      method: "POST",
      body: {
        title: input.title,
        source_name: input.sourceName,
        content_type: input.contentType,
        subject_id: input.subjectId,
        text: input.text,
      },
      schema: documentBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapDocument(result.data) } : result;
  },
  uploadFile: async (formData: FormData) => {
    const result = await apiRequest("/api/v1/admin/knowledge-base/documents/upload", {
      method: "POST",
      body: formData,
      schema: documentBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapDocument(result.data) } : result;
  },
  ingest: async (documentId: string) => {
    const result = await apiRequest(`/api/v1/admin/knowledge-base/documents/${documentId}/ingest`, {
      method: "POST",
      schema: ingestResponseBackendSchema,
      timeoutMs: 45_000,
    });
    return result.ok
      ? {
          ok: true as const,
          data: {
            documentId: result.data.document_id,
            ingestionStatus: result.data.ingestion_status,
            chunkCount: result.data.chunk_count,
            failureDetail: result.data.failure_detail ?? null,
          },
        }
      : result;
  },
  search: async (query: string, topK?: number) => {
    const result = await apiRequest("/api/v1/admin/knowledge-base/search", {
      method: "POST",
      body: { query, top_k: topK },
      schema: searchResponseBackendSchema,
      timeoutMs: 20_000,
    });
    return result.ok ? { ok: true as const, data: mapSearchResponse(result.data) } : result;
  },
};

// ---------------------------------------------------------------------------
// Admin: user management -- real accounts, admin-only (see
// backend/app/api/routes/admin_users.py).
// ---------------------------------------------------------------------------

export const adminUsersApi = {
  list: async () => {
    const result = await apiRequest("/api/v1/admin/users", { schema: z.array(adminUserBackendSchema) });
    return result.ok ? { ok: true as const, data: result.data.map(mapAdminUser) } : result;
  },
  updateRole: async (userId: string, role: UserRole) => {
    const result = await apiRequest(`/api/v1/admin/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
      schema: adminUserBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapAdminUser(result.data) } : result;
  },
};
