/**
 * Zod schemas mirroring the FastAPI backend's actual Pydantic response
 * shapes (snake_case, as sent over the wire). Every real API response is
 * validated against one of these before being mapped to the frontend's
 * camelCase view models in src/lib/api-mappers.ts — if the backend's
 * contract ever drifts, requests fail loudly (invalid_shape) instead of
 * silently rendering garbage.
 */
import { z } from "zod";

export const varkPreferenceBackendSchema = z.enum(["visual", "auditory", "read_write", "kinesthetic"]);

export const learnerPreferencesBackendSchema = z.object({
  vark_preferences: z.array(varkPreferenceBackendSchema),
  preferred_detail: z.string().nullable().optional(),
  learning_goal: z.string().nullable().optional(),
});

export const learnerBackendSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  email: z.string().optional().nullable(),
  role: z.enum(["learner", "admin"]).optional(),
  preferences: learnerPreferencesBackendSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const difficultyBackendSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const topicBackendSchema = z.object({
  id: z.string(),
  subject_id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  difficulty: difficultyBackendSchema,
});

export const subjectBackendSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  is_active: z.boolean(),
});

export const subjectDetailBackendSchema = subjectBackendSchema.extend({
  topics: z.array(topicBackendSchema),
});

const sourceReferenceBackendSchema = z.object({
  chunk_id: z.string(),
  document_title: z.string(),
  excerpt: z.string(),
});

export const lessonBlockBackendSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("explanation"), heading: z.string(), body: z.string() }),
  z.object({ type: z.literal("key_concept"), title: z.string(), explanation: z.string() }),
  z.object({ type: z.literal("step_by_step_example"), title: z.string(), steps: z.array(z.string()) }),
  z.object({
    type: z.literal("diagram"),
    caption: z.string(),
    nodes: z.array(z.object({ id: z.string(), label: z.string() })),
    edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string().nullable().optional() })),
  }),
  z.object({
    type: z.literal("interactive_visualization"),
    component_type: z.literal("linked_list"),
    title: z.string(),
    config: z.object({
      node_values: z.array(z.string()),
      mode: z.enum(["static", "traversal"]),
    }),
  }),
  z.object({
    type: z.literal("practice_question"),
    prompt: z.string(),
    options: z.array(z.string()),
    correct_option_index: z.number().int(),
    explanation: z.string(),
  }),
  z.object({ type: z.literal("summary"), points: z.array(z.string()) }),
  z.object({ type: z.literal("source_references"), sources: z.array(sourceReferenceBackendSchema) }),
]);

const lessonBackendSchema = z.object({
  id: z.string(),
  topic: z.object({ id: z.string(), name: z.string() }),
  title: z.string(),
  learning_objectives: z.array(z.string()),
  blocks: z.array(lessonBlockBackendSchema),
  source_references: z.array(sourceReferenceBackendSchema),
  next_activity: z
    .object({
      type: z.enum(["practice", "review", "lesson"]),
      label: z.string(),
      topic_id: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const lessonSessionBackendSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  topic_id: z.string(),
  prompt: z.string(),
  vark_preferences: z.array(varkPreferenceBackendSchema),
  status: z.enum(["generating", "ready", "failed"]),
  lesson: lessonBackendSchema.nullable(),
  source_references: z.array(sourceReferenceBackendSchema),
  failure_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const lessonSessionSummaryBackendSchema = z.object({
  id: z.string(),
  topic_id: z.string(),
  topic_name: z.string(),
  status: z.enum(["generating", "ready", "failed"]),
  prompt: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const savedLessonBackendSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  lesson_session_id: z.string(),
  topic_name: z.string(),
  lesson_title: z.string().nullable(),
  saved_at: z.string(),
});

export const questionPublicBackendSchema = z.object({
  id: z.string(),
  topic_id: z.string(),
  question_text: z.string(),
  question_type: z.enum(["multiple_choice", "true_false"]),
  options: z.array(z.string()).nullable(),
  difficulty: difficultyBackendSchema,
});

export const attemptReadBackendSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  question_id: z.string(),
  submitted_answer: z.union([z.number(), z.boolean()]),
  is_correct: z.boolean(),
  score: z.number(),
  feedback: z.string(),
  created_at: z.string(),
});

export const attemptResultBackendSchema = z.object({
  attempt_id: z.string(),
  question_id: z.string(),
  is_correct: z.boolean(),
  score: z.number(),
  feedback: z.string(),
  explanation: z.string(),
  created_at: z.string(),
});

export const progressBackendSchema = z.object({
  learner_id: z.string(),
  topic_id: z.string(),
  topic_name: z.string(),
  mastery_estimate: z.number(),
  attempts_count: z.number().int(),
  correct_count: z.number().int(),
  last_activity_at: z.string().nullable(),
  updated_at: z.string(),
});

export const recommendationBackendSchema = z.object({
  topic_id: z.string(),
  topic_name: z.string(),
  recommendation_type: z.enum(["beginner_practice", "review", "practice_harder", "continue"]),
  label: z.string(),
  rationale: z.string(),
});

export const documentBackendSchema = z.object({
  id: z.string(),
  title: z.string(),
  source_name: z.string().nullable(),
  content_type: z.enum(["text", "markdown"]),
  subject_id: z.string().nullable(),
  ingestion_status: z.enum(["uploaded", "chunking", "embedding", "indexed", "failed"]),
  failure_detail: z.string().nullable(),
  chunk_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ingestResponseBackendSchema = z.object({
  document_id: z.string(),
  ingestion_status: z.enum(["uploaded", "chunking", "embedding", "indexed", "failed"]),
  chunk_count: z.number().int(),
  failure_detail: z.string().nullable().optional(),
});

export const searchResponseBackendSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      chunk_id: z.string(),
      document_id: z.string(),
      document_title: z.string(),
      excerpt: z.string(),
      similarity_score: z.number(),
    }),
  ),
  warning: z.string().nullable().optional(),
});
