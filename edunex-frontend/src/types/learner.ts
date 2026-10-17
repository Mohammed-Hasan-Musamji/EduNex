export type VarkPreference = "visual" | "auditory" | "read_write" | "kinesthetic";

/**
 * Matches the real backend Learner resource. There is no email/password or
 * role on this model — EduNex has no authentication system yet (see
 * backend/README.md). `id` is a device-local identifier, not a verified
 * identity; see src/lib/learner-storage.ts.
 */
export interface Learner {
  id: string;
  displayName: string;
  preferences: LearnerPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerPreferences {
  varkPreferences: VarkPreference[];
  preferredDetail?: string | null;
  learningGoal?: string | null;
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

export type AdminRole = "learner" | "admin";
export type AccountStatus = "active" | "inactive";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AccountStatus;
  joinedAt: string;
}

export interface NextStepRecommendation {
  kind: "lesson" | "practice" | "review";
  title: string;
  description: string;
  topicId: string;
  href: string;
}
