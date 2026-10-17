/**
 * EduNex has no authentication system yet (see backend README). This module
 * persists a non-sensitive, device-local learner identifier so the rest of
 * the app has something to scope requests to. It is NOT a session token or
 * proof of identity — anyone with this id (or a guessed one) can act as
 * that learner, because the backend does not verify ownership either.
 */

const LEARNER_ID_KEY = "edunex.learner_id";
const LEARNER_NAME_KEY = "edunex.learner_name";

export function getStoredLearnerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_ID_KEY);
}

export function getStoredLearnerName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_NAME_KEY);
}

export function storeLearner(id: string, displayName: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNER_ID_KEY, id);
  window.localStorage.setItem(LEARNER_NAME_KEY, displayName);
}

export function clearStoredLearner(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEARNER_ID_KEY);
  window.localStorage.removeItem(LEARNER_NAME_KEY);
}
