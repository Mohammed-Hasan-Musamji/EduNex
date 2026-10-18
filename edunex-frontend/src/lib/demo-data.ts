/**
 * Centralized demo fixtures, used only where the real FastAPI backend has
 * no corresponding capability (see backend/README.md "Known limitations" —
 * e.g. no user/role system, no subject-content beyond Data Structures ->
 * Linked Lists, no analytics aggregation). Everything here is clearly
 * surfaced to the user as demo data — see `appConfig.demoDataLabel`.
 */
import type { Subject, Topic } from "@/types/content";
import type {
  CurrentLearningStatus,
  MasteryIndicator,
  NextStepRecommendation,
  RecentActivity,
  StruggleArea,
  AdminUserRecord,
} from "@/types/learner";
import type { Lesson, SavedLesson } from "@/types/lesson";
import type { Assessment, AssessmentResult, QuestionAnswer } from "@/types/assessment";
import { buildLearnUrl, routes } from "@/lib/routes";
import { generateId, slugify } from "@/lib/utils";

function demoTopic(subjectId: string, name: string, difficulty: Topic["difficulty"]): Topic {
  const slug = slugify(name);
  return { id: slug, subjectId, name, slug, description: `${name} (demo topic — no backend content yet).`, difficulty };
}

function demoSubject(name: string, description: string, topics: [string, Topic["difficulty"]][]): Subject {
  const id = slugify(name);
  return { id, name, slug: id, description, isActive: true, topics: topics.map(([n, d]) => demoTopic(id, n, d)) };
}

/**
 * Extra example subjects shown alongside the real "Data Structures" subject
 * from the backend, so learners can see the intended breadth of the
 * catalog. None of these have real seeded content or questions — the
 * Explore Subjects page marks them with a "Demo" badge.
 */
export const demoSubjects: Subject[] = [
  demoSubject("Computer Science", "Core concepts behind how software and computers work.", [
    ["Algorithms", "intermediate"],
    ["Complexity Analysis", "intermediate"],
    ["Recursion", "beginner"],
  ]),
  demoSubject("Physics", "The fundamental laws governing matter, energy, and motion.", [
    ["Kinematics", "beginner"],
    ["Newton's Laws", "intermediate"],
    ["Thermodynamics", "advanced"],
  ]),
  demoSubject("Chemistry", "The composition, structure, and reactions of matter.", [
    ["Atomic Structure", "beginner"],
    ["Chemical Bonding", "intermediate"],
    ["Stoichiometry", "intermediate"],
  ]),
  demoSubject("Calculus", "Rates of change and accumulation through limits, derivatives, and integrals.", [
    ["Limits", "beginner"],
    ["Derivatives", "intermediate"],
    ["Integrals", "advanced"],
  ]),
  demoSubject("Operating Systems", "How operating systems manage processes, memory, and files.", [
    ["Process Scheduling", "intermediate"],
    ["Memory Management", "advanced"],
    ["File Systems", "intermediate"],
  ]),
  demoSubject("Database Management Systems", "Designing, querying, and managing relational and non-relational data.", [
    ["Relational Model", "beginner"],
    ["Normalization", "intermediate"],
    ["Indexing", "advanced"],
  ]),
];

export const demoCurrentLearning: CurrentLearningStatus = {
  topicId: "linked-lists",
  topicName: "Linked Lists",
  objective: "Understand how nodes connect via pointers and practice traversal.",
  status: "in_progress",
  masteryLevel: 62,
};

export const demoStruggleAreas: StruggleArea[] = [
  {
    topicId: "linked-lists",
    topicName: "Linked Lists",
    conceptName: "Removing a node from the middle of the list",
    reason: "Missed 2 of 3 recent practice questions on re-linking pointers.",
  },
  {
    topicId: "newtons-laws",
    topicName: "Newton's Laws",
    conceptName: "Free-body diagrams",
    reason: "Low demonstrated mastery (41%) on force-balance problems.",
  },
];

export const demoNextSteps: NextStepRecommendation[] = [
  {
    kind: "lesson",
    title: "Continue Linked Lists",
    description: "Pick up the node-removal walkthrough where you left off.",
    topicId: "linked-lists",
    href: buildLearnUrl({ topicId: "linked-lists" }),
  },
  {
    kind: "practice",
    title: "Practice: Linked Lists",
    description: "A short assessment to check your understanding.",
    topicId: "linked-lists",
    href: routes.learner.practice,
  },
  {
    kind: "review",
    title: "Review Newton's Laws",
    description: "Revisit free-body diagrams before the next physics lesson (demo topic).",
    topicId: "newtons-laws",
    href: buildLearnUrl({ topicId: "newtons-laws" }),
  },
];

export const demoMastery: MasteryIndicator[] = [
  { topicId: "linked-list-basics", topicName: "Linked List Basics", masteryLevel: 92 },
  { topicId: "pointer-updates", topicName: "Pointer Updates & Pointer Chasing", masteryLevel: 68 },
  { topicId: "edge-cases", topicName: "Edge Case Handling (Empty List, 1-Node List)", masteryLevel: 45 },
  { topicId: "big-o-complexity", topicName: "Big-O Asymptotic Complexity", masteryLevel: 88 },
];

export const demoRecentActivity: RecentActivity[] = [
  {
    id: "act-1",
    description: "Completed a practice set on Stacks & Queues",
    occurredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "act-2",
    description: "Started the Linked Lists lesson",
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

/**
 * Demo-preview lesson shown only when real generation fails because Gemini
 * isn't configured/available — always rendered with a visible "Demo
 * preview" badge, never silently substituted for a real result. See
 * LearnWorkspace.tsx.
 */
export function generateDemoLesson(topicId: string, topicName: string, fallbackPrompt?: string): Lesson {
  // Matched by name, not id -- the real "Linked Lists" topic has a backend
  // UUID id, not the old "linked-lists" slug.
  if (topicName.toLowerCase() === "linked lists") {
    return {
      id: generateId("lesson"),
      topicId,
      topicName,
      title: "Understanding Linked Lists",
      learningObjectives: [
        "Explain what a linked list is",
        "Understand how nodes connect via pointers",
        "Practice traversal, insertion, and removal",
      ],
      isDemo: true,
      sourceReferences: [],
      nextActivity: { type: "practice", label: "Test your understanding", topicId },
      blocks: [
        {
          type: "explanation",
          id: generateId("block"),
          heading: "What is a linked list?",
          body:
            "A linked list is a sequence of nodes where each node stores a value and a pointer to the next node. Unlike an array, nodes don't need to sit next to each other in memory — the chain of pointers is what keeps them in order.",
        },
        {
          type: "key_concept",
          id: generateId("block"),
          title: "Head pointer",
          explanation: "A reference to the first node in the list. If the head is null, the list is empty.",
        },
        {
          type: "step_by_step_example",
          id: generateId("block"),
          title: "Traversing a list",
          steps: [
            "Start at the head pointer.",
            "Read the current node's value.",
            "Follow its “next” pointer to move forward.",
            "Stop when the next pointer is null — you've reached the end.",
          ],
        },
        {
          type: "interactive_visualization",
          id: generateId("block"),
          componentType: "linked_list",
          title: "Try it yourself",
          config: { nodeValues: ["12", "7", "34"], mode: "traversal" },
        },
        {
          type: "practice_question",
          id: generateId("block"),
          prompt: "When you remove a node from the middle of a linked list, what must you update?",
          options: [
            "Nothing — removal is automatic",
            "The previous node's next pointer, so it skips the removed node",
            "Every node's value in the list",
            "Only the head pointer",
          ],
          correctOptionIndex: 1,
          explanation:
            "Removing a middle node means re-linking: the previous node's “next” must point to the node after the one being removed.",
        },
        {
          type: "summary",
          id: generateId("block"),
          points: [
            "A linked list is a chain of nodes connected by pointers.",
            "The head pointer marks the start; a null pointer marks the end.",
            "Insertion and removal only require re-linking pointers, not shifting memory.",
          ],
        },
      ],
    };
  }

  return {
    id: generateId("lesson"),
    topicId,
    topicName,
    title: `Getting started with ${topicName}`,
    learningObjectives: [`Understand the basics of ${topicName}`],
    isDemo: true,
    sourceReferences: [],
    nextActivity: null,
    blocks: [
      {
        type: "explanation",
        id: generateId("block"),
        heading: `Getting started with ${topicName}`,
        body:
          fallbackPrompt
            ? `You asked: "${fallbackPrompt}". This preview lesson is demo content generated in the browser — once this topic is connected to the FastAPI lesson-generation endpoint, this block will be replaced with a retrieval-grounded explanation.`
            : "This preview lesson is demo content generated in the browser, since this topic has no backend-seeded content yet.",
      },
      {
        type: "summary",
        id: generateId("block"),
        points: [`This is demo data for ${topicName}, not a live Gemini response.`],
      },
    ],
  };
}

export const demoAssessments: Assessment[] = [
  {
    id: "assessment-newtons-laws",
    topicId: "newtons-laws",
    topicName: "Newton's Laws",
    isDemo: true,
    questions: [
      {
        id: "demo-q1",
        topicId: "newtons-laws",
        type: "multiple_choice",
        prompt: "An object in motion stays in motion unless acted on by a force. Which law is this?",
        options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation"],
        correctOptionIndex: 0,
        explanation: "This is Newton's First Law, the law of inertia.",
      },
      {
        id: "demo-q2",
        topicId: "newtons-laws",
        type: "short_answer",
        prompt: "In one sentence, state Newton's Third Law.",
        correctAnswerText: "equal and opposite",
        explanation: "For every action there is an equal and opposite reaction.",
      },
    ],
  },
];

export function scoreDemoAssessment(assessment: Assessment, answers: QuestionAnswer[]): AssessmentResult {
  const questionResults = assessment.questions.map((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    let correct = false;

    if (question.type === "multiple_choice") {
      correct = answer?.selectedOptionIndex === question.correctOptionIndex;
    } else if (question.type === "short_answer") {
      const normalized = answer?.textAnswer?.trim().toLowerCase() ?? "";
      correct = Boolean(question.correctAnswerText) && normalized.includes(question.correctAnswerText!.toLowerCase());
    }

    return { questionId: question.id, correct, explanation: question.explanation ?? "" };
  });

  const score = Math.round((questionResults.filter((r) => r.correct).length / questionResults.length) * 100);

  return {
    assessmentId: assessment.id,
    topicId: assessment.topicId,
    score,
    completedAt: new Date().toISOString(),
    questionResults,
  };
}

export const demoSavedLessons: SavedLesson[] = [
  {
    id: "saved-demo-1",
    lessonSessionId: "demo-newtons-laws",
    topicName: "Newton's Laws",
    lessonTitle: "Newton's Laws: Free-body diagrams (demo)",
    savedAt: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
  },
];

export interface DemoLessonCompletion {
  topicId: string;
  topicName: string;
  completedAt: string;
}

export const demoLessonCompletions: DemoLessonCompletion[] = [
  { topicId: "limits", topicName: "Limits", completedAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString() },
];

export const demoAdminStats = {
  totalUsers: 428,
  activeToday: 96,
  totalDocuments: 37,
  indexedDocuments: 31,
};

export interface ServiceHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  detail: string;
}

export const demoServiceHealth: ServiceHealthStatus[] = [
  { name: "FastAPI backend", status: "healthy", detail: "/health responding normally" },
  { name: "PostgreSQL / pgvector", status: "healthy", detail: "Connected" },
  { name: "Gemini generation", status: "down", detail: "GEMINI_API_KEY not configured on the server" },
];

export const demoPlatformActivity = [
  {
    id: "pa-1",
    description: "12 new learners registered",
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "pa-2",
    description: "Uploaded “Thermodynamics — Chapter 4.md”",
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
];

/**
 * No backend user/role system exists at all (see backend/README.md) — this
 * page is entirely local demo data until a real admin user model is built.
 */
export const demoAdminUsers: AdminUserRecord[] = [
  { id: "u1", name: "Amara Chen", email: "amara.chen@example.com", role: "learner", status: "active", joinedAt: "2025-11-02T00:00:00.000Z" },
  { id: "u2", name: "Diego Ramirez", email: "diego.ramirez@example.com", role: "learner", status: "active", joinedAt: "2025-12-14T00:00:00.000Z" },
  { id: "u3", name: "Priya Natarajan", email: "priya.n@example.com", role: "admin", status: "active", joinedAt: "2025-08-21T00:00:00.000Z" },
  { id: "u4", name: "Samuel Okafor", email: "samuel.okafor@example.com", role: "learner", status: "inactive", joinedAt: "2025-09-30T00:00:00.000Z" },
  { id: "u5", name: "Lena Fischer", email: "lena.fischer@example.com", role: "learner", status: "active", joinedAt: "2026-01-05T00:00:00.000Z" },
];

export const demoAnalytics = {
  activeUsers7d: 312,
  avgSessionMinutes: 18,
  lessonCompletionRate: 74,
  avgAssessmentScore: 81,
  feedbackPositiveRate: 88,
};
