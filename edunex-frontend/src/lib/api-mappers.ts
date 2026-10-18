/**
 * Maps validated raw backend DTOs (snake_case, see backend-schemas.ts) to
 * the frontend's camelCase view models used throughout the UI.
 */
import { generateId } from "@/lib/utils";
import type { Learner, LearnerPreferences, VarkPreference } from "@/types/learner";
import type { Subject, Topic, AcademicDocument, RetrievedChunk } from "@/types/content";
import type {
  ChatMessage,
  DiagramBlock,
  Lesson,
  LessonBlock,
  LessonSessionStatus,
  SourceReference,
} from "@/types/lesson";
import type { AssessmentQuestion } from "@/types/assessment";
import type { z } from "zod";
import type {
  learnerBackendSchema,
  subjectBackendSchema,
  subjectDetailBackendSchema,
  topicBackendSchema,
  lessonSessionBackendSchema,
  lessonSessionSummaryBackendSchema,
  lessonBlockBackendSchema,
  savedLessonBackendSchema,
  questionPublicBackendSchema,
  progressBackendSchema,
  recommendationBackendSchema,
  documentBackendSchema,
  searchResponseBackendSchema,
  adminUserBackendSchema,
  rewardSummaryBackendSchema,
  gamificationSummaryBackendSchema,
  timelineEventBackendSchema,
  analyticsBackendSchema,
  practiceRoundResultBackendSchema,
  diagnosticSummaryBackendSchema,
  diagnosticStateBackendSchema,
  diagnosticListItemBackendSchema,
  notificationBackendSchema,
} from "@/lib/backend-schemas";
import type {
  AppNotification,
  DiagnosticListItem,
  DiagnosticState,
  DiagnosticSummary,
  GamificationSummary,
  LearnerAnalytics,
  PracticeRoundResult,
  RewardSummary,
  TimelineEvent,
} from "@/types/engagement";
import type { AdminUserRecord } from "@/types/learner";

type LearnerDTO = z.infer<typeof learnerBackendSchema>;
type AdminUserDTO = z.infer<typeof adminUserBackendSchema>;
type SubjectDTO = z.infer<typeof subjectBackendSchema>;
type SubjectDetailDTO = z.infer<typeof subjectDetailBackendSchema>;
type TopicDTO = z.infer<typeof topicBackendSchema>;
type LessonSessionDTO = z.infer<typeof lessonSessionBackendSchema>;
type LessonSessionSummaryDTO = z.infer<typeof lessonSessionSummaryBackendSchema>;
type SavedLessonDTO = z.infer<typeof savedLessonBackendSchema>;
type QuestionDTO = z.infer<typeof questionPublicBackendSchema>;
type ProgressDTO = z.infer<typeof progressBackendSchema>;
type RecommendationDTO = z.infer<typeof recommendationBackendSchema>;
type DocumentDTO = z.infer<typeof documentBackendSchema>;
type SearchResponseDTO = z.infer<typeof searchResponseBackendSchema>;

export function mapPreferences(dto: LearnerDTO["preferences"]): LearnerPreferences {
  return {
    varkPreferences: dto.vark_preferences as VarkPreference[],
    preferredDetail: dto.preferred_detail ?? null,
    learningGoal: dto.learning_goal ?? null,
    varkSource: dto.vark_source ?? null,
    varkScores: dto.vark_scores ?? null,
    varkAssessedAt: dto.vark_assessed_at ?? null,
  };
}

export function mapLearner(dto: LearnerDTO): Learner {
  return {
    id: dto.id,
    displayName: dto.display_name,
<<<<<<< HEAD
    email: dto.email ?? undefined,
    role: dto.role ?? "learner",
=======
    email: dto.email,
    role: dto.role,
    onboardingStatus: dto.onboarding_status,
>>>>>>> b5abe61 (Implemented 3)
    preferences: mapPreferences(dto.preferences),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapAdminUser(dto: AdminUserDTO): AdminUserRecord {
  return {
    id: dto.id,
    displayName: dto.display_name,
    email: dto.email,
    role: dto.role,
    createdAt: dto.created_at,
  };
}

export function mapTopic(dto: TopicDTO): Topic {
  return {
    id: dto.id,
    subjectId: dto.subject_id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    difficulty: dto.difficulty,
  };
}

export function mapSubject(dto: SubjectDTO): Subject {
  return { id: dto.id, name: dto.name, slug: dto.slug, description: dto.description, isActive: dto.is_active, topics: [] };
}

export function mapSubjectDetail(dto: SubjectDetailDTO): Subject {
  return { ...mapSubject(dto), topics: dto.topics.map(mapTopic) };
}

function mapSourceReference(dto: { chunk_id: string; document_title: string; excerpt: string }): SourceReference {
  return { chunkId: dto.chunk_id, documentTitle: dto.document_title, excerpt: dto.excerpt };
}

type LessonBlockDTO = z.infer<typeof lessonBlockBackendSchema>;

function mapBlock(block: LessonBlockDTO): LessonBlock {
  const id = generateId("block");
  switch (block.type) {
    case "explanation":
      return { type: "explanation", id, heading: block.heading, body: block.body };
    case "key_concept":
      return { type: "key_concept", id, title: block.title, explanation: block.explanation };
    case "step_by_step_example":
      return { type: "step_by_step_example", id, title: block.title, steps: block.steps };
    case "diagram":
      return {
        type: "diagram",
        id,
        caption: block.caption,
        nodes: block.nodes,
        edges: block.edges.map((e) => ({ source: e.source, target: e.target, label: e.label ?? null })),
      } satisfies DiagramBlock;
    case "interactive_visualization":
      return {
        type: "interactive_visualization",
        id,
        componentType: block.component_type,
        title: block.title,
        config: { nodeValues: block.config.node_values, mode: block.config.mode },
      };
    case "practice_question":
      return {
        type: "practice_question",
        id,
        prompt: block.prompt,
        options: block.options,
        correctOptionIndex: block.correct_option_index,
        explanation: block.explanation,
      };
    case "summary":
      return { type: "summary", id, points: block.points };
    case "source_references":
      return { type: "source_references", id, sources: block.sources.map(mapSourceReference) };
  }
}

export function mapLesson(dto: NonNullable<LessonSessionDTO["lesson"]>): Lesson {
  return {
    id: dto.id,
    topicId: dto.topic.id,
    topicName: dto.topic.name,
    title: dto.title,
    learningObjectives: dto.learning_objectives,
    blocks: dto.blocks.map(mapBlock),
    sourceReferences: dto.source_references.map(mapSourceReference),
    nextActivity: dto.next_activity
      ? { type: dto.next_activity.type, label: dto.next_activity.label, topicId: dto.next_activity.topic_id ?? null }
      : null,
  };
}

export interface MappedLessonSession {
  id: string;
  learnerId: string;
  topicId: string;
  prompt: string;
  varkPreferences: VarkPreference[];
  status: LessonSessionStatus;
  lesson: Lesson | null;
  failureReason: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export function mapLessonSession(dto: LessonSessionDTO): MappedLessonSession {
  return {
    id: dto.id,
    learnerId: dto.learner_id,
    topicId: dto.topic_id,
    prompt: dto.prompt,
    varkPreferences: dto.vark_preferences as VarkPreference[],
    status: dto.status,
    lesson: dto.lesson ? mapLesson(dto.lesson) : null,
    failureReason: dto.failure_reason,
    completedAt: dto.completed_at ?? null,
    updatedAt: dto.updated_at,
  };
}

export interface MappedLessonSummary {
  id: string;
  topicId: string;
  topicName: string;
  status: LessonSessionStatus;
  prompt: string;
  lessonTitle: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export function mapLessonSummary(dto: LessonSessionSummaryDTO): MappedLessonSummary {
  return {
    id: dto.id,
    topicId: dto.topic_id,
    topicName: dto.topic_name,
    status: dto.status,
    prompt: dto.prompt,
    lessonTitle: dto.lesson_title ?? null,
    completedAt: dto.completed_at ?? null,
    updatedAt: dto.updated_at,
  };
}

export function mapSavedLesson(dto: SavedLessonDTO) {
  return {
    id: dto.id,
    lessonSessionId: dto.lesson_session_id,
    topicName: dto.topic_name,
    lessonTitle: dto.lesson_title,
    savedAt: dto.saved_at,
  };
}

export function mapQuestion(dto: QuestionDTO): AssessmentQuestion {
  return {
    id: dto.id,
    topicId: dto.topic_id,
    type: dto.question_type,
    prompt: dto.question_text,
    options: dto.options ?? undefined,
    difficulty: dto.difficulty,
    origin: dto.origin,
    sourceTitle: dto.source_title ?? null,
    sourcePage: dto.source_page ?? null,
  };
}

export function mapProgress(dto: ProgressDTO) {
  return {
    learnerId: dto.learner_id,
    topicId: dto.topic_id,
    topicName: dto.topic_name,
    masteryEstimate: dto.mastery_estimate,
    attemptsCount: dto.attempts_count,
    correctCount: dto.correct_count,
    lastActivityAt: dto.last_activity_at,
    updatedAt: dto.updated_at,
  };
}

export function mapRecommendation(dto: RecommendationDTO) {
  return {
    topicId: dto.topic_id,
    topicName: dto.topic_name,
    recommendationType: dto.recommendation_type,
    label: dto.label,
    rationale: dto.rationale,
    difficulty: dto.difficulty ?? null,
    suggestedActivity: dto.suggested_activity ?? null,
  };
}

export function mapDocument(dto: DocumentDTO): AcademicDocument {
  return {
    id: dto.id,
    title: dto.title,
    sourceName: dto.source_name,
    contentType: dto.content_type,
    subjectId: dto.subject_id,
    ingestionStatus: dto.ingestion_status,
    failureDetail: dto.failure_detail,
    chunkCount: dto.chunk_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapSearchResponse(dto: SearchResponseDTO): { results: RetrievedChunk[]; warning: string | null } {
  return {
    results: dto.results.map((r) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      excerpt: r.excerpt,
      similarityScore: r.similarity_score,
    })),
    warning: dto.warning ?? null,
  };
}

export function newAssistantMessage(content: string): ChatMessage {
  return { id: generateId("msg"), role: "assistant", content, createdAt: new Date().toISOString(), status: "sent" };
}

// ---------------------------------------------------------------------------
// Gamification, analytics, diagnostics, notifications
// ---------------------------------------------------------------------------

type RewardDTO = z.infer<typeof rewardSummaryBackendSchema>;
type GamificationDTO = z.infer<typeof gamificationSummaryBackendSchema>;
type TimelineDTO = z.infer<typeof timelineEventBackendSchema>;
type AnalyticsDTO = z.infer<typeof analyticsBackendSchema>;
type RoundDTO = z.infer<typeof practiceRoundResultBackendSchema>;
type DiagnosticSummaryDTO = z.infer<typeof diagnosticSummaryBackendSchema>;
type DiagnosticStateDTO = z.infer<typeof diagnosticStateBackendSchema>;
type DiagnosticListItemDTO = z.infer<typeof diagnosticListItemBackendSchema>;
type NotificationDTO = z.infer<typeof notificationBackendSchema>;

export function mapRewards(dto: RewardDTO): RewardSummary {
  return {
    xpAwarded: dto.xp_awarded,
    xpTotal: dto.xp_total,
    level: dto.level,
    leveledUp: dto.leveled_up,
    currentStreak: dto.current_streak,
    newAchievements: dto.new_achievements.map((a) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      xpReward: a.xp_reward,
    })),
    notes: dto.notes,
  };
}

export function mapGamification(dto: GamificationDTO): GamificationSummary {
  return {
    xpTotal: dto.xp_total,
    level: dto.level,
    levelFloorXp: dto.level_floor_xp,
    nextLevelXp: dto.next_level_xp,
    currentStreak: dto.current_streak,
    bestStreak: dto.best_streak,
    activeToday: dto.active_today,
    lastActiveDate: dto.last_active_date,
    streakPolicy: dto.streak_policy,
    activityTimezone: dto.activity_timezone,
    activityCalendar: dto.activity_calendar.map((d) => ({ date: d.date, activityCount: d.activity_count })),
    achievements: dto.achievements.map((a) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      xpReward: a.xp_reward,
      earnedAt: a.earned_at,
      progressCurrent: a.progress_current,
      progressTarget: a.progress_target,
    })),
    xpRules: dto.xp_rules.map((r) => ({ eventType: r.event_type, label: r.label, xp: r.xp, note: r.note ?? null })),
  };
}

export function mapTimelineEvent(dto: TimelineDTO): TimelineEvent {
  return {
    id: dto.id,
    eventType: dto.event_type,
    title: dto.title,
    description: dto.description,
    xpAwarded: dto.xp_awarded,
    resourceId: dto.resource_id,
    occurredAt: dto.occurred_at,
  };
}

export function mapAnalytics(dto: AnalyticsDTO): LearnerAnalytics {
  const s = dto.summary;
  return {
    summary: {
      lessonsCompleted: s.lessons_completed,
      lessonsGenerated: s.lessons_generated,
      assessmentsCompleted: s.assessments_completed,
      questionsAnswered: s.questions_answered,
      overallAccuracy: s.overall_accuracy,
      conceptsMastered: s.concepts_mastered,
      conceptsNeedingAttention: s.concepts_needing_attention,
      currentStreak: s.current_streak,
      xpTotal: s.xp_total,
      level: s.level,
    },
    scoreTrend: dto.score_trend.map((p) => ({
      roundId: p.round_id,
      kind: p.kind,
      label: p.label,
      score: p.score,
      correct: p.correct,
      total: p.total,
      completedAt: p.completed_at,
    })),
    dailyActivity: dto.daily_activity.map((d) => ({
      date: d.date,
      questionsAnswered: d.questions_answered,
      correct: d.correct,
      lessonsCompleted: d.lessons_completed,
    })),
    topicMastery: dto.topic_mastery.map((t) => ({
      topicId: t.topic_id,
      topicName: t.topic_name,
      subjectName: t.subject_name,
      difficulty: t.difficulty,
      mastery: t.mastery,
      attempts: t.attempts,
      correct: t.correct,
      status: t.status,
      lastActivityAt: t.last_activity_at,
    })),
    difficultyBreakdown: dto.difficulty_breakdown,
    masteryPolicy: {
      masteredThreshold: dto.mastery_policy.mastered_threshold,
      needsAttentionThreshold: dto.mastery_policy.needs_attention_threshold,
      minAttempts: dto.mastery_policy.min_attempts,
    },
    activityTimezone: dto.activity_timezone,
  };
}

export function mapPracticeRound(dto: RoundDTO): PracticeRoundResult {
  return {
    roundId: dto.round_id,
    topicId: dto.topic_id,
    topicName: dto.topic_name,
    correct: dto.correct,
    total: dto.total,
    score: dto.score,
    previousScore: dto.previous_score,
    results: dto.results.map((r) => ({
      questionId: r.question_id,
      isCorrect: r.is_correct,
      explanation: r.explanation,
      difficulty: r.difficulty,
    })),
    replayed: dto.replayed,
    rewards: dto.rewards ? mapRewards(dto.rewards) : null,
  };
}

function mapDiagnosticSummary(dto: DiagnosticSummaryDTO): DiagnosticSummary {
  return {
    subjectId: dto.subject_id,
    subjectName: dto.subject_name,
    overallScore: dto.overall_score,
    correct: dto.correct,
    total: dto.total,
    topics: dto.topics.map((t) => ({
      topicId: t.topic_id,
      topicName: t.topic_name,
      topicDifficulty: t.topic_difficulty,
      attempted: t.attempted,
      correct: t.correct,
      accuracy: t.accuracy,
      status: t.status,
      limitedEvidence: t.limited_evidence,
    })),
    prerequisiteGaps: dto.prerequisite_gaps,
    prerequisiteRule: dto.prerequisite_rule,
    byDifficulty: dto.by_difficulty,
    recommendedDifficulty: dto.recommended_difficulty,
    recommendedDifficultyReason: dto.recommended_difficulty_reason,
    recommendation: dto.recommendation
      ? {
          topicId: dto.recommendation.topic_id,
          topicName: dto.recommendation.topic_name,
          difficulty: dto.recommendation.difficulty,
          activity: dto.recommendation.activity,
          reason: dto.recommendation.reason,
        }
      : null,
    coverage: {
      questionsAnswered: dto.coverage.questions_answered,
      topicsAssessed: dto.coverage.topics_assessed,
      topicsTotal: dto.coverage.topics_total,
      limitedEvidence: dto.coverage.limited_evidence,
      note: dto.coverage.note,
    },
  };
}

export function mapDiagnosticState(dto: DiagnosticStateDTO): DiagnosticState {
  return {
    id: dto.id,
    subjectId: dto.subject_id,
    subjectName: dto.subject_name,
    status: dto.status,
    answeredCount: dto.answered_count,
    correctCount: dto.correct_count,
    maxQuestions: dto.max_questions,
    currentDifficulty: dto.current_difficulty,
    question: dto.question ? { ...mapQuestion(dto.question), difficulty: dto.question.difficulty } : null,
    questionTopicName: dto.question_topic_name,
    summary: dto.summary ? mapDiagnosticSummary(dto.summary) : null,
    completedAt: dto.completed_at,
  };
}

export function mapDiagnosticListItem(dto: DiagnosticListItemDTO): DiagnosticListItem {
  return {
    id: dto.id,
    subjectId: dto.subject_id,
    subjectName: dto.subject_name,
    status: dto.status,
    score: dto.score,
    answeredCount: dto.answered_count,
    createdAt: dto.created_at,
    completedAt: dto.completed_at,
  };
}

export function mapNotification(dto: NotificationDTO): AppNotification {
  return {
    id: dto.id,
    type: dto.notification_type,
    title: dto.title,
    body: dto.body,
    resourceType: dto.resource_type,
    resourceId: dto.resource_id,
    isRead: dto.is_read,
    createdAt: dto.created_at,
  };
}
