/** Matches the backend's QuestionType enum — both types are graded server-side. */
export type QuestionType = "multiple_choice" | "true_false";

export interface AssessmentQuestion {
  id: string;
  topicId: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  /** "generated" items were written by AI from a textbook passage (see sourceTitle/sourcePage). */
  origin?: string;
  sourceTitle?: string | null;
  sourcePage?: number | null;
}

export interface Assessment {
  id: string;
  topicId: string;
  topicName: string;
  questions: AssessmentQuestion[];
}

export interface QuestionAnswer {
  questionId: string;
  selectedOptionIndex?: number;
  selectedBoolean?: boolean;
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
