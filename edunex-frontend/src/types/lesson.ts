import type { VarkPreference } from "./learner";

export interface SourceReference {
  chunkId: string;
  documentTitle: string;
  excerpt: string;
}

export interface ExplanationBlock {
  type: "explanation";
  id: string;
  heading: string;
  body: string;
}

export interface KeyConceptBlock {
  type: "key_concept";
  id: string;
  title: string;
  explanation: string;
}

export interface StepByStepExampleBlock {
  type: "step_by_step_example";
  id: string;
  title: string;
  steps: string[];
}

export interface DiagramNode {
  id: string;
  label: string;
}

export interface DiagramEdge {
  source: string;
  target: string;
  label?: string | null;
}

export interface DiagramBlock {
  type: "diagram";
  id: string;
  caption: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type InteractiveVisualizationKind = "linked_list";

export interface LinkedListVisualizationConfig {
  nodeValues: string[];
  mode: "static" | "traversal";
}

export interface InteractiveVisualizationBlock {
  type: "interactive_visualization";
  id: string;
  componentType: InteractiveVisualizationKind;
  title: string;
  config: LinkedListVisualizationConfig;
}

export interface PracticeQuestionBlock {
  type: "practice_question";
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface SummaryBlock {
  type: "summary";
  id: string;
  points: string[];
}

export interface SourceReferencesBlock {
  type: "source_references";
  id: string;
  sources: SourceReference[];
}

export type LessonBlock =
  | ExplanationBlock
  | KeyConceptBlock
  | StepByStepExampleBlock
  | DiagramBlock
  | InteractiveVisualizationBlock
  | PracticeQuestionBlock
  | SummaryBlock
  | SourceReferencesBlock;

export interface NextActivity {
  type: "practice" | "review" | "lesson";
  label: string;
  topicId?: string | null;
}

export interface Lesson {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  learningObjectives: string[];
  blocks: LessonBlock[];
  sourceReferences: SourceReference[];
  nextActivity: NextActivity | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
}

export interface SavedLesson {
  id: string;
  lessonSessionId: string;
  topicName: string;
  lessonTitle: string | null;
  savedAt: string;
}

export type LessonSessionStatus = "generating" | "ready" | "failed";

export interface LearningSession {
  id: string;
  topicId: string;
  topicName: string;
  varkPreferences: VarkPreference[];
  lesson: Lesson | null;
  messages: ChatMessage[];
  updatedAt: string;
  /** The real backend lesson_session id, once a real (non-demo) generation has succeeded. */
  lessonSessionId?: string;
}
