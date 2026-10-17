/**
 * EduNex has no authentication system yet (see backend README). This module
 * persists a non-sensitive, device-local learner identifier so the rest of
 * the app has something to scope requests to. It is NOT a session token or
 * proof of identity — anyone with this id (or a guessed one) can act as
 * that learner, because the backend does not verify ownership either.
 */

const LEARNER_ID_KEY = "edunex.learner_id";
const LEARNER_NAME_KEY = "edunex.learner_name";
const LEARNER_EMAIL_KEY = "edunex.learner_email";
const LEARNER_ROLE_KEY = "edunex.learner_role";

export function getStoredLearnerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_ID_KEY);
}

export function getStoredLearnerName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_NAME_KEY);
}

export function getStoredLearnerRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_ROLE_KEY);
}

export function getStoredLearnerEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LEARNER_EMAIL_KEY);
}

export function storeLearner(id: string, displayName: string, email?: string, role?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNER_ID_KEY, id);
  window.localStorage.setItem(LEARNER_NAME_KEY, displayName);
  if (email) window.localStorage.setItem(LEARNER_EMAIL_KEY, email);
  if (role) window.localStorage.setItem(LEARNER_ROLE_KEY, role);
}

export function clearStoredLearner(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEARNER_ID_KEY);
  window.localStorage.removeItem(LEARNER_NAME_KEY);
  window.localStorage.removeItem(LEARNER_EMAIL_KEY);
  window.localStorage.removeItem(LEARNER_ROLE_KEY);
}

