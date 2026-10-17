import type { VarkPreference } from "./learner";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string;
  difficulty: DifficultyLevel;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  topics: Topic[];
}

export type DocumentProcessingStage = "uploaded" | "chunking" | "embedding" | "indexed" | "failed";

export interface AcademicDocument {
  id: string;
  title: string;
  sourceName: string | null;
  contentType: "text" | "markdown";
  subjectId: string | null;
  ingestionStatus: DocumentProcessingStage;
  failureDetail: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  excerpt: string;
  similarityScore: number;
}

export interface StartLearningRequest {
  topicId: string;
  topicName: string;
  varkPreferences: VarkPreference[];
}
