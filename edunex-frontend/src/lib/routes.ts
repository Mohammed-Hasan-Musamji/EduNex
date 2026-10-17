export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  learner: {
    dashboard: "/learner/dashboard",
    subjects: "/learner/subjects",
    learn: "/learner/learn",
    practice: "/learner/practice",
    progress: "/learner/progress",
    savedLessons: "/learner/saved-lessons",
  },
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    courses: "/admin/courses",
    knowledgeBase: "/admin/knowledge-base",
    analyticsSettings: "/admin/analytics-settings",
  },
};

/**
 * Builds the Learn with AI URL for a given topic. Only a topic identifier and
 * non-sensitive VARK preference keys are placed in the query string — never
 * learner-identifying or session-secret data.
 */
export function buildLearnUrl(params: {
  topicId: string;
  vark?: string[];
  sessionId?: string;
}): string {
  const search = new URLSearchParams();
  search.set("topic", params.topicId);
  if (params.vark && params.vark.length > 0) {
    search.set("vark", params.vark.join(","));
  }
  if (params.sessionId) {
    search.set("session", params.sessionId);
  }
  return `${routes.learner.learn}?${search.toString()}`;
}

/** Builds a URL that reopens an existing, real backend lesson session by id. */
export function buildResumeLessonUrl(lessonSessionId: string): string {
  return `${routes.learner.learn}?session=${encodeURIComponent(lessonSessionId)}`;
}
