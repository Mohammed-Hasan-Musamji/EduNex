/**
 * `multiple_choice` and `true_false` are evaluated by the real backend.
 * `short_answer` is demo-only — the backend does not implement short-answer
 * grading (see backend/README.md "Known limitations"), so any such question
 * in the UI is always clearly-labeled local demo data.
 */
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface AssessmentQuestion {
  id: string;
  topicId: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  /** Demo-only: used solely by the local demo scoring adapter for topics with no backend questions. */
  correctOptionIndex?: number;
  correctAnswerText?: string;
  explanation?: string;
}

export interface Assessment {
  id: string;
  topicId: string;
  topicName: string;
  questions: AssessmentQuestion[];
  /** True for topics with no real backend-seeded questions (anything but Linked Lists today). */
  isDemo: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  selectedBoolean?: boolean;
  textAnswer?: string;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  explanation: string;
}

export interface AssessmentResult {
  assessmentId: string;
  topicId: string;
  score: number; // percentage 0-100
  completedAt: string;
  questionResults: QuestionResult[];
}
