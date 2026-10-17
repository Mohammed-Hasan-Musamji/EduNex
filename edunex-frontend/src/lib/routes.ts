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
 * Builds the Learn with AI URL for starting a *new* topic. Only a topic
 * identifier and non-sensitive VARK preference keys go in the query string —
 * never learner-identifying data. To reopen an existing real lesson session,
 * use buildResumeLessonUrl instead (a different query param, handled
 * differently by LearnWorkspace).
 */
export function buildLearnUrl(params: { topicId: string; vark?: string[] }): string {
  const search = new URLSearchParams();
  search.set("topic", params.topicId);
  if (params.vark && params.vark.length > 0) {
    search.set("vark", params.vark.join(","));
  }
  return `${routes.learner.learn}?${search.toString()}`;
}

/** Builds a URL that reopens an existing, real backend lesson session by id. */
export function buildResumeLessonUrl(lessonSessionId: string): string {
  return `${routes.learner.learn}?session=${encodeURIComponent(lessonSessionId)}`;
}
