import type { ZodType } from "zod";
import { ApiError, type ApiResult } from "@/types/api";
import {
  learnerBackendSchema,
  subjectBackendSchema,
  subjectDetailBackendSchema,
  topicBackendSchema,
  lessonSessionBackendSchema,
  lessonSessionSummaryBackendSchema,
  savedLessonBackendSchema,
  questionPublicBackendSchema,
  attemptResultBackendSchema,
  attemptReadBackendSchema,
  progressBackendSchema,
  recommendationBackendSchema,
  documentBackendSchema,
  ingestResponseBackendSchema,
  searchResponseBackendSchema,
} from "@/lib/backend-schemas";
import {
  mapLearner,
  mapSubject,
  mapSubjectDetail,
  mapTopic,
  mapLessonSession,
  mapLessonSummary,
  mapSavedLesson,
  mapQuestion,
  mapProgress,
  mapRecommendation,
  mapDocument,
  mapSearchResponse,
} from "@/lib/api-mappers";
import type { VarkPreference, LearnerPreferences } from "@/types/learner";
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

/**
 * Marks integration points where the FastAPI backend does not yet expose a
 * real endpoint (admin user management, admin analytics). Returns
 * clearly-labeled demo data instead of fabricating a successful network
 * call, so callers can distinguish real and demo state.
 */
export function demoAdapter<T>(data: T): Promise<ApiResult<T>> {
  return Promise.resolve({ ok: true, data });
}

// ---------------------------------------------------------------------------
// Learners -- there is no authentication system. `learner_id` is a
// device-local identifier (see src/lib/learner-storage.ts), not a verified
// session. See backend/README.md "Known limitations".
// ---------------------------------------------------------------------------

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
      method: "POST",
      body: { display_name: displayName },
      schema: learnerBackendSchema,
    });
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
  get: async (learnerId: string) => {
    const result = await apiRequest(`/api/v1/learners/${learnerId}`, { schema: learnerBackendSchema });
    if (!result.ok && result.error.kind === "unauthorized") {
      const resumeResult = await apiRequest(`/api/v1/learners/${learnerId}/resume`, {
        method: "POST",
        schema: learnerBackendSchema,
      });
      return resumeResult.ok ? { ok: true as const, data: mapLearner(resumeResult.data) } : resumeResult;
    }
    return result.ok ? { ok: true as const, data: mapLearner(result.data) } : result;
  },
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
  create: async (input: { learnerId: string; topicId: string; prompt: string; varkPreferences: VarkPreference[] }) => {
    const result = await apiRequest("/api/v1/lessons", {
      method: "POST",
      body: {
        learner_id: input.learnerId,
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
  resume: async (lessonId: string) => {
    const result = await apiRequest(`/api/v1/lessons/${lessonId}/resume`, {
      method: "POST",
      schema: lessonSessionBackendSchema,
      timeoutMs: 45_000,
    });
    return result.ok ? { ok: true as const, data: mapLessonSession(result.data) } : result;
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
  listQuestions: async (topicId: string) => {
    const result = await apiRequest(`/api/v1/topics/${topicId}/questions`, {
      schema: z.array(questionPublicBackendSchema),
    });
    return result.ok ? { ok: true as const, data: result.data.map(mapQuestion) } : result;
  },
  submitAttempt: async (input: { learnerId: string; questionId: string; submittedAnswer: number | boolean }) => {
    const result = await apiRequest("/api/v1/assessments/attempts", {
      method: "POST",
      body: { learner_id: input.learnerId, question_id: input.questionId, submitted_answer: input.submittedAnswer },
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

/**
 * Not implemented on the backend yet -- there is no user/role/account
 * system, only the bare Learner profile. The admin Users page applies
 * changes locally and clearly labels them as not persisted.
 */
export const adminUsersApi = {
  updateUser: (id: string, patch: { role?: string; status?: string }) =>
    apiRequest(`/admin/users/${id}`, { method: "PATCH", body: patch }),
};
