export type VarkPreference = "visual" | "auditory" | "read_write" | "kinesthetic";

export type UserRole = "learner" | "admin";

/** `completed` is only set by the server when a diagnostic finishes. */
export type OnboardingStatus = "not_started" | "in_progress" | "skipped" | "completed";

/**
 * Matches the real backend Learner resource (GET /api/v1/auth/me). `id` is
 * the authenticated account's id, established by a signed, httpOnly session
 * cookie (see src/components/learner/LearnerProvider.tsx) — never a
 * client-supplied or device-local value.
 */
export interface Learner {
  id: string;
  displayName: string;
<<<<<<< HEAD
  email?: string;
  role?: AdminRole;
=======
  email: string;
  role: UserRole;
  onboardingStatus: OnboardingStatus;
>>>>>>> b5abe61 (Implemented 3)
  preferences: LearnerPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerPreferences {
  varkPreferences: VarkPreference[];
  preferredDetail?: string | null;
  learningGoal?: string | null;
  /** Server-set provenance: chosen by hand, or derived from the questionnaire. */
  varkSource?: "self_selected" | "questionnaire" | null;
  varkScores?: Record<string, number> | null;
  varkAssessedAt?: string | null;
}

export interface CurrentLearningStatus {
  topicId: string;
  topicName: string;
  objective: string;
  status: "in_progress" | "not_started";
  masteryLevel?: number;
}

export interface RecentActivity {
  id: string;
  description: string;
  occurredAt: string;
}

export interface MasteryIndicator {
  topicId: string;
  topicName: string;
  masteryLevel: number; // 0-100, demonstrated mastery from assessments
}

export interface StruggleArea {
  topicId: string;
  topicName: string;
  conceptName: string;
  reason: string;
}

/**
 * Matches the real backend admin user resource (GET /api/v1/admin/users).
 * There is no account-active/inactive concept on the backend — don't
 * fabricate one here.
 */
export interface AdminUserRecord {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface NextStepRecommendation {
  kind: "lesson" | "practice" | "review";
  title: string;
  description: string;
  topicId: string;
  href: string;
}
