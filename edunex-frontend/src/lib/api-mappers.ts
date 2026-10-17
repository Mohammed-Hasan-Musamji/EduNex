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
} from "@/lib/backend-schemas";

type LearnerDTO = z.infer<typeof learnerBackendSchema>;
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
  };
}

export function mapLearner(dto: LearnerDTO): Learner {
  return {
    id: dto.id,
    displayName: dto.display_name,
    email: dto.email ?? undefined,
    role: dto.role ?? "learner",
    preferences: mapPreferences(dto.preferences),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
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
    updatedAt: dto.updated_at,
  };
}

export interface MappedLessonSummary {
  id: string;
  topicId: string;
  topicName: string;
  status: LessonSessionStatus;
  prompt: string;
  updatedAt: string;
}

export function mapLessonSummary(dto: LessonSessionSummaryDTO): MappedLessonSummary {
  return {
    id: dto.id,
    topicId: dto.topic_id,
    topicName: dto.topic_name,
    status: dto.status,
    prompt: dto.prompt,
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
