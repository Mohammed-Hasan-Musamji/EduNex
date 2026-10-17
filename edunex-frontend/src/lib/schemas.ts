import { z } from "zod";

export const PROMPT_MAX_LENGTH = 1000;

/**
 * There is no password-based authentication -- see backend/README.md
 * "Known limitations". Creating a profile only requires a display name.
 */
export const createProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(120, "Keep it under 120 characters"),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const learnerIdSchema = z.object({
  learnerId: z.string().trim().uuid("That doesn't look like a valid learner ID"),
});
export type LearnerIdInput = z.infer<typeof learnerIdSchema>;

export const varkPreferenceSchema = z.enum(["visual", "auditory", "read_write", "kinesthetic"]);

export const startLearningSchema = z.object({
  topicId: z.string().trim().min(1, "Select a topic to continue"),
  varkPreferences: z.array(varkPreferenceSchema).default([]),
});
export type StartLearningInput = z.infer<typeof startLearningSchema>;

export const chatPromptSchema = z
  .string()
  .trim()
  .min(1, "Enter a question or topic")
  .max(PROMPT_MAX_LENGTH, `Keep prompts under ${PROMPT_MAX_LENGTH} characters`);

export const subjectFormSchema = z.object({
  name: z.string().trim().min(2, "Subject name is required"),
  description: z.string().trim().min(1, "Description is required"),
});
export type SubjectFormInput = z.infer<typeof subjectFormSchema>;

// Only plain text/Markdown is supported -- matches the backend's actual
// app/rag/document_loader.py, which never handles PDFs or other formats.
export const documentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 25 * 1024 * 1024, "File must be 25MB or smaller")
    .refine(
      (file) => /\.(txt|md|markdown)$/i.test(file.name),
      "Only plain text (.txt) or Markdown (.md) files are supported",
    ),
  subjectId: z.string().trim().optional(),
});

export const assessmentAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptionIndex: z.number().int().min(0).optional(),
  selectedBoolean: z.boolean().optional(),
  textAnswer: z.string().trim().min(1).optional(),
});

// --- Lesson block runtime validation (defense-in-depth: re-checked here even
// though app/lib/api-mappers.ts already validated the raw backend response) ---

const sourceReferenceSchema = z.object({
  chunkId: z.string(),
  documentTitle: z.string(),
  excerpt: z.string(),
});

export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("explanation"), id: z.string(), heading: z.string(), body: z.string() }),
  z.object({ type: z.literal("key_concept"), id: z.string(), title: z.string(), explanation: z.string() }),
  z.object({ type: z.literal("step_by_step_example"), id: z.string(), title: z.string(), steps: z.array(z.string()) }),
  z.object({
    type: z.literal("diagram"),
    id: z.string(),
    caption: z.string(),
    nodes: z.array(z.object({ id: z.string(), label: z.string() })),
    edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string().nullable().optional() })),
  }),
  z.object({
    type: z.literal("interactive_visualization"),
    id: z.string(),
    componentType: z.enum(["linked_list"]),
    title: z.string(),
    config: z.object({
      nodeValues: z.array(z.string()),
      mode: z.enum(["static", "traversal"]),
    }),
  }),
  z.object({
    type: z.literal("practice_question"),
    id: z.string(),
    prompt: z.string(),
    options: z.array(z.string()),
    correctOptionIndex: z.number().int().min(0),
    explanation: z.string(),
  }),
  z.object({ type: z.literal("summary"), id: z.string(), points: z.array(z.string()) }),
  z.object({ type: z.literal("source_references"), id: z.string(), sources: z.array(sourceReferenceSchema) }),
]);

export const lessonSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  topicName: z.string(),
  title: z.string(),
  learningObjectives: z.array(z.string()),
  blocks: z.array(lessonBlockSchema),
  sourceReferences: z.array(sourceReferenceSchema),
  nextActivity: z
    .object({ type: z.enum(["practice", "review", "lesson"]), label: z.string(), topicId: z.string().nullable().optional() })
    .nullable()
    .optional(),
  isDemo: z.boolean().optional(),
});
