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
  vark_source: z.enum(["self_selected", "questionnaire"]).nullable().optional(),
  vark_scores: z.record(z.string(), z.number()).nullable().optional(),
  vark_assessed_at: z.string().nullable().optional(),
});

export const learnerRoleBackendSchema = z.enum(["learner", "admin"]);

export const onboardingStatusBackendSchema = z.enum(["not_started", "in_progress", "skipped", "completed"]);

export const learnerBackendSchema = z.object({
  id: z.string(),
  display_name: z.string(),
<<<<<<< HEAD
  email: z.string().optional().nullable(),
  role: z.enum(["learner", "admin"]).optional(),
=======
  email: z.string(),
  role: learnerRoleBackendSchema,
  onboarding_status: onboardingStatusBackendSchema,
>>>>>>> b5abe61 (Implemented 3)
  preferences: learnerPreferencesBackendSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const adminUserBackendSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  email: z.string(),
  role: learnerRoleBackendSchema,
  created_at: z.string(),
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
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const lessonSessionSummaryBackendSchema = z.object({
  id: z.string(),
  topic_id: z.string(),
  topic_name: z.string(),
  status: z.enum(["generating", "ready", "failed"]),
  prompt: z.string(),
  lesson_title: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
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
  origin: z.string().optional(),
  review_status: z.string().optional(),
  source_title: z.string().nullable().optional(),
  source_page: z.number().int().nullable().optional(),
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
  difficulty: difficultyBackendSchema.nullable().optional(),
  suggested_activity: z.enum(["lesson", "practice"]).nullable().optional(),
  priority: z.number().int().optional(),
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

// ---------------------------------------------------------------------------
// Gamification, analytics, diagnostics, notifications
// ---------------------------------------------------------------------------

export const achievementBriefBackendSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  xp_reward: z.number().int(),
});

export const rewardSummaryBackendSchema = z.object({
  xp_awarded: z.number().int(),
  xp_total: z.number().int(),
  level: z.number().int(),
  leveled_up: z.boolean(),
  current_streak: z.number().int(),
  new_achievements: z.array(achievementBriefBackendSchema),
  notes: z.array(z.string()),
});

export const gamificationSummaryBackendSchema = z.object({
  xp_total: z.number().int(),
  level: z.number().int(),
  level_floor_xp: z.number().int(),
  next_level_xp: z.number().int(),
  current_streak: z.number().int(),
  best_streak: z.number().int(),
  active_today: z.boolean(),
  last_active_date: z.string().nullable(),
  streak_policy: z.string(),
  activity_timezone: z.string(),
  activity_calendar: z.array(z.object({ date: z.string(), activity_count: z.number().int() })),
  achievements: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      description: z.string(),
      requirement: z.string(),
      xp_reward: z.number().int(),
      earned_at: z.string().nullable(),
      progress_current: z.number().int(),
      progress_target: z.number().int(),
    }),
  ),
  xp_rules: z.array(z.object({ event_type: z.string(), label: z.string(), xp: z.number().int(), note: z.string().nullable().optional() })),
});

export const timelineEventBackendSchema = z.object({
  id: z.string(),
  event_type: z.enum([
    "lesson_completed",
    "practice_round_submitted",
    "diagnostic_completed",
    "improvement_demonstrated",
    "concept_mastered",
    "achievement_earned",
  ]),
  title: z.string(),
  description: z.string(),
  xp_awarded: z.number().int(),
  resource_id: z.string().nullable(),
  occurred_at: z.string(),
});

const topicStatusBackendSchema = z.enum(["mastered", "developing", "needs_attention", "not_started"]);

export const analyticsBackendSchema = z.object({
  summary: z.object({
    lessons_completed: z.number().int(),
    lessons_generated: z.number().int(),
    assessments_completed: z.number().int(),
    questions_answered: z.number().int(),
    overall_accuracy: z.number().nullable(),
    concepts_mastered: z.number().int(),
    concepts_needing_attention: z.number().int(),
    current_streak: z.number().int(),
    xp_total: z.number().int(),
    level: z.number().int(),
  }),
  score_trend: z.array(
    z.object({
      round_id: z.string(),
      kind: z.enum(["practice", "diagnostic"]),
      label: z.string(),
      score: z.number(),
      correct: z.number().int(),
      total: z.number().int(),
      completed_at: z.string(),
    }),
  ),
  daily_activity: z.array(
    z.object({ date: z.string(), questions_answered: z.number().int(), correct: z.number().int(), lessons_completed: z.number().int() }),
  ),
  topic_mastery: z.array(
    z.object({
      topic_id: z.string(),
      topic_name: z.string(),
      subject_name: z.string(),
      difficulty: difficultyBackendSchema,
      mastery: z.number().nullable(),
      attempts: z.number().int(),
      correct: z.number().int(),
      status: topicStatusBackendSchema,
      last_activity_at: z.string().nullable(),
    }),
  ),
  difficulty_breakdown: z.array(z.object({ difficulty: difficultyBackendSchema, attempts: z.number().int(), correct: z.number().int() })),
  mastery_policy: z.object({ mastered_threshold: z.number(), needs_attention_threshold: z.number(), min_attempts: z.number().int() }),
  activity_timezone: z.string(),
});

export const practiceRoundResultBackendSchema = z.object({
  round_id: z.string(),
  topic_id: z.string(),
  topic_name: z.string(),
  correct: z.number().int(),
  total: z.number().int(),
  score: z.number(),
  previous_score: z.number().nullable(),
  results: z.array(
    z.object({ question_id: z.string(), is_correct: z.boolean(), explanation: z.string(), difficulty: difficultyBackendSchema }),
  ),
  completed_at: z.string(),
  replayed: z.boolean(),
  rewards: rewardSummaryBackendSchema.nullable(),
});

export const lessonCompletionBackendSchema = z.object({
  lesson_session_id: z.string(),
  completed_at: z.string(),
  already_completed: z.boolean(),
  rewards: rewardSummaryBackendSchema.nullable(),
});

const conceptStatusBackendSchema = z.enum(["demonstrated", "developing", "needs_attention", "not_assessed"]);

export const diagnosticSummaryBackendSchema = z.object({
  subject_id: z.string(),
  subject_name: z.string(),
  overall_score: z.number(),
  correct: z.number().int(),
  total: z.number().int(),
  topics: z.array(
    z.object({
      topic_id: z.string(),
      topic_name: z.string(),
      topic_difficulty: difficultyBackendSchema,
      attempted: z.number().int(),
      correct: z.number().int(),
      accuracy: z.number().nullable(),
      status: conceptStatusBackendSchema,
      limited_evidence: z.boolean(),
    }),
  ),
  prerequisite_gaps: z.array(z.string()),
  prerequisite_rule: z.string(),
  by_difficulty: z.array(z.object({ difficulty: difficultyBackendSchema, attempted: z.number().int(), correct: z.number().int() })),
  recommended_difficulty: difficultyBackendSchema,
  recommended_difficulty_reason: z.string(),
  recommendation: z
    .object({
      topic_id: z.string(),
      topic_name: z.string(),
      difficulty: difficultyBackendSchema,
      activity: z.enum(["lesson", "practice"]),
      reason: z.string(),
    })
    .nullable(),
  coverage: z.object({
    questions_answered: z.number().int(),
    topics_assessed: z.number().int(),
    topics_total: z.number().int(),
    limited_evidence: z.boolean(),
    note: z.string(),
  }),
});

export const diagnosticStateBackendSchema = z.object({
  id: z.string(),
  subject_id: z.string(),
  subject_name: z.string(),
  status: z.enum(["in_progress", "completed"]),
  answered_count: z.number().int(),
  correct_count: z.number().int(),
  max_questions: z.number().int(),
  current_difficulty: difficultyBackendSchema.nullable(),
  question: questionPublicBackendSchema.nullable(),
  question_topic_name: z.string().nullable(),
  summary: diagnosticSummaryBackendSchema.nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

export const diagnosticAnswerResultBackendSchema = z.object({
  attempt: attemptResultBackendSchema,
  state: diagnosticStateBackendSchema,
  rewards: rewardSummaryBackendSchema.nullable(),
});

export const diagnosticListItemBackendSchema = z.object({
  id: z.string(),
  subject_id: z.string(),
  subject_name: z.string(),
  status: z.enum(["in_progress", "completed"]),
  score: z.number().nullable(),
  answered_count: z.number().int(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

export const notificationBackendSchema = z.object({
  id: z.string(),
  notification_type: z.enum(["achievement_earned", "level_up", "streak_milestone", "diagnostic_results", "concept_mastered"]),
  title: z.string(),
  body: z.string(),
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export const notificationListBackendSchema = z.object({
  items: z.array(notificationBackendSchema),
  unread_count: z.number().int(),
});

// ---------------------------------------------------------------------------
// Textbook tutor, catalog documents, skill profile, VARK, learning plan
// ---------------------------------------------------------------------------

export const tutorAnswerBackendSchema = z.object({
  interaction_id: z.string(),
  answer: z.string(),
  grounded: z.boolean(),
  support: z.enum(["supported", "partial", "not_found"]),
  sources: z.array(
    z.object({
      ref: z.number().int(),
      chunk_id: z.string(),
      document_id: z.string(),
      title: z.string(),
      subject_id: z.string().nullable(),
      subject: z.string().nullable(),
      chapter: z.string().nullable(),
      section: z.string().nullable(),
      source_file: z.string().nullable(),
      page_start: z.number().int().nullable(),
      page_end: z.number().int().nullable(),
      similarity: z.number(),
      excerpt: z.string(),
    }),
  ),
  retrieval: z.object({
    retrieved: z.number().int(),
    top_similarity: z.number().nullable(),
    min_similarity: z.number(),
    subject_id: z.string().nullable(),
    document_id: z.string().nullable(),
  }),
  personalization: z.object({ vark_preferences: z.array(z.string()), explanation: z.string() }),
  created_at: z.string(),
});

export const subjectDocumentBackendSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic_id: z.string().nullable(),
  chapter_number: z.string().nullable(),
  page_count: z.number().int().nullable(),
  chunk_count: z.number().int(),
});

export const skillProfileBackendSchema = z.object({
  method: z.string(),
  topics: z.array(
    z.object({
      topic_id: z.string(),
      topic_name: z.string(),
      subject_id: z.string(),
      subject_name: z.string(),
      difficulty: difficultyBackendSchema,
      attempts: z.number().int(),
      correct: z.number().int(),
      measured_accuracy: z.number().nullable(),
      estimated_mastery: z.number(),
      uncertainty: z.number(),
      evidence_level: z.enum(["none", "low", "medium", "high"]),
      last_assessed_at: z.string().nullable(),
      change_since_first_snapshot: z.number().nullable(),
      misconceptions: z.array(
        z.object({ question_id: z.string(), question_text: z.string(), times_missed: z.number().int(), explanation: z.string() }),
      ),
    }),
  ),
});

export const varkQuestionnaireBackendSchema = z.object({
  version: z.string(),
  instructions: z.string(),
  disclaimer: z.string(),
  min_answered: z.number().int(),
  questions: z.array(
    z.object({ id: z.string(), prompt: z.string(), options: z.array(z.object({ id: z.string(), text: z.string() })) }),
  ),
});

export const varkResultBackendSchema = z.object({
  id: z.string(),
  questionnaire_version: z.string(),
  scores: z.record(z.string(), z.number()),
  preferred: z.array(z.string()),
  explanation: z.string(),
  created_at: z.string(),
});

export const learningPlanBackendSchema = z.object({
  vark_preferences: z.array(z.string()),
  vark_source: z.string().nullable(),
  items: z.array(
    z.object({
      topic_id: z.string(),
      topic_name: z.string(),
      difficulty: difficultyBackendSchema.nullable(),
      recommendation_type: z.string(),
      label: z.string(),
      reason: z.string(),
      activities: z.array(
        z.object({ format: z.string(), action: z.string(), label: z.string(), modality: z.string(), preferred: z.boolean() }),
      ),
    }),
  ),
  note: z.string(),
});
