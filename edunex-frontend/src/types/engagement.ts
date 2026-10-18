/**
 * View models for gamification, analytics, diagnostics, and notifications.
 * Every value is computed by the backend (see backend/app/services/
 * gamification_service.py, analytics_service.py, diagnostic_service.py) —
 * the frontend only displays it, never derives XP or scores itself.
 */
import type { DifficultyLevel } from "./content";
import type { AssessmentQuestion } from "./assessment";

export interface AchievementBrief {
  code: string;
  title: string;
  description: string;
  xpReward: number;
}

export interface RewardSummary {
  xpAwarded: number;
  xpTotal: number;
  level: number;
  leveledUp: boolean;
  currentStreak: number;
  newAchievements: AchievementBrief[];
  notes: string[];
}

export interface AchievementStatus {
  code: string;
  title: string;
  description: string;
  xpReward: number;
  earnedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
}

export interface GamificationSummary {
  xpTotal: number;
  level: number;
  levelFloorXp: number;
  nextLevelXp: number;
  currentStreak: number;
  bestStreak: number;
  activeToday: boolean;
  lastActiveDate: string | null;
  streakPolicy: string;
  activityTimezone: string;
  activityCalendar: { date: string; activityCount: number }[];
  achievements: AchievementStatus[];
  xpRules: { eventType: string; label: string; xp: number; note: string | null }[];
}

export type TimelineEventType =
  | "lesson_completed"
  | "practice_round_submitted"
  | "diagnostic_completed"
  | "improvement_demonstrated"
  | "concept_mastered"
  | "achievement_earned";

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  title: string;
  description: string;
  xpAwarded: number;
  resourceId: string | null;
  occurredAt: string;
}

export type TopicStatus = "mastered" | "developing" | "needs_attention" | "not_started";

export interface LearnerAnalytics {
  summary: {
    lessonsCompleted: number;
    lessonsGenerated: number;
    assessmentsCompleted: number;
    questionsAnswered: number;
    overallAccuracy: number | null;
    conceptsMastered: number;
    conceptsNeedingAttention: number;
    currentStreak: number;
    xpTotal: number;
    level: number;
  };
  scoreTrend: {
    roundId: string;
    kind: "practice" | "diagnostic";
    label: string;
    score: number;
    correct: number;
    total: number;
    completedAt: string;
  }[];
  dailyActivity: { date: string; questionsAnswered: number; correct: number; lessonsCompleted: number }[];
  topicMastery: {
    topicId: string;
    topicName: string;
    subjectName: string;
    difficulty: DifficultyLevel;
    mastery: number | null;
    attempts: number;
    correct: number;
    status: TopicStatus;
    lastActivityAt: string | null;
  }[];
  difficultyBreakdown: { difficulty: DifficultyLevel; attempts: number; correct: number }[];
  masteryPolicy: { masteredThreshold: number; needsAttentionThreshold: number; minAttempts: number };
  activityTimezone: string;
}

export interface PracticeRoundResult {
  roundId: string;
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  score: number;
  previousScore: number | null;
  results: { questionId: string; isCorrect: boolean; explanation: string; difficulty: DifficultyLevel }[];
  replayed: boolean;
  rewards: RewardSummary | null;
}

export type ConceptStatus = "demonstrated" | "developing" | "needs_attention" | "not_assessed";

export interface DiagnosticSummary {
  subjectId: string;
  subjectName: string;
  overallScore: number;
  correct: number;
  total: number;
  topics: {
    topicId: string;
    topicName: string;
    topicDifficulty: DifficultyLevel;
    attempted: number;
    correct: number;
    accuracy: number | null;
    status: ConceptStatus;
    limitedEvidence: boolean;
  }[];
  prerequisiteGaps: string[];
  prerequisiteRule: string;
  byDifficulty: { difficulty: DifficultyLevel; attempted: number; correct: number }[];
  recommendedDifficulty: DifficultyLevel;
  recommendedDifficultyReason: string;
  recommendation: {
    topicId: string;
    topicName: string;
    difficulty: DifficultyLevel;
    activity: "lesson" | "practice";
    reason: string;
  } | null;
  coverage: { questionsAnswered: number; topicsAssessed: number; topicsTotal: number; limitedEvidence: boolean; note: string };
}

export interface DiagnosticState {
  id: string;
  subjectId: string;
  subjectName: string;
  status: "in_progress" | "completed";
  answeredCount: number;
  correctCount: number;
  maxQuestions: number;
  currentDifficulty: DifficultyLevel | null;
  question: (AssessmentQuestion & { difficulty: DifficultyLevel }) | null;
  questionTopicName: string | null;
  summary: DiagnosticSummary | null;
  completedAt: string | null;
}

export interface DiagnosticAnswerResult {
  attempt: { isCorrect: boolean; feedback: string; explanation: string; questionId: string };
  state: DiagnosticState;
  rewards: RewardSummary | null;
}

export interface DiagnosticListItem {
  id: string;
  subjectId: string;
  subjectName: string;
  status: "in_progress" | "completed";
  score: number | null;
  answeredCount: number;
  createdAt: string;
  completedAt: string | null;
}

export type NotificationType =
  | "achievement_earned"
  | "level_up"
  | "streak_milestone"
  | "diagnostic_results"
  | "concept_mastered";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface TutorSource {
  ref: number;
  chunkId: string;
  documentId: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  section: string | null;
  sourceFile: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  similarity: number;
  excerpt: string;
}

export interface TutorAnswer {
  interactionId: string;
  answer: string;
  grounded: boolean;
  support: "supported" | "partial" | "not_found";
  sources: TutorSource[];
  retrieved: number;
  personalization: { varkPreferences: string[]; explanation: string };
}

export interface SubjectDocument {
  id: string;
  title: string;
  topicId: string | null;
  chapterNumber: string | null;
  pageCount: number | null;
  chunkCount: number;
}

export type EvidenceLevel = "none" | "low" | "medium" | "high";

export interface TopicSkill {
  topicId: string;
  topicName: string;
  subjectName: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  attempts: number;
  correct: number;
  measuredAccuracy: number | null;
  estimatedMastery: number;
  uncertainty: number;
  evidenceLevel: EvidenceLevel;
  lastAssessedAt: string | null;
  changeSinceFirst: number | null;
  misconceptions: { questionId: string; questionText: string; timesMissed: number; explanation: string }[];
}

export interface SkillProfile {
  method: string;
  topics: TopicSkill[];
}

export interface VarkQuestionnaire {
  version: string;
  instructions: string;
  disclaimer: string;
  minAnswered: number;
  questions: { id: string; prompt: string; options: { id: string; text: string }[] }[];
}

export interface VarkResult {
  id: string;
  scores: Record<string, number>;
  preferred: string[];
  explanation: string;
  createdAt: string;
}

export interface LearningPlan {
  varkPreferences: string[];
  varkSource: string | null;
  note: string;
  items: {
    topicId: string;
    topicName: string;
    difficulty: "beginner" | "intermediate" | "advanced" | null;
    label: string;
    reason: string;
    activities: { format: string; action: "lesson" | "tutor" | "practice" | string; label: string; modality: string; preferred: boolean }[];
  }[];
}
