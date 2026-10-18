"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
<<<<<<< HEAD
import { authApi, learnerApi } from "@/lib/api-client";
import { clearStoredLearner, getStoredLearnerId, storeLearner } from "@/lib/learner-storage";
=======
import { authApi } from "@/lib/api-client";
>>>>>>> b5abe61 (Implemented 3)
import type { Learner } from "@/types/learner";

export interface LearnerContextValue {
  learner: Learner | null;
  isLoading: boolean;
<<<<<<< HEAD
  /** Creates a new learner profile and persists it as this device's active learner. */
  createLearner: (displayName: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Explicitly sets the active authenticated user (learner or admin). */
  setAuthenticatedUser: (user: Learner) => void;
  /** Re-fetches the active learner/user from the backend. */
=======
  /** Registers a real backend account and starts a session (httpOnly cookie). */
  register: (input: { displayName: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Signs in to an existing account and starts a session. */
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Re-fetches the authenticated learner (e.g. after updating preferences elsewhere). */
>>>>>>> b5abe61 (Implemented 3)
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const LearnerContext = createContext<LearnerContextValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

<<<<<<< HEAD
  const loadFromStorage = useCallback(async () => {
    // 1. Try checking session cookie via /auth/me
    const meResult = await authApi.me();
    if (meResult.ok) {
      storeLearner(meResult.data.id, meResult.data.displayName, meResult.data.email, meResult.data.role);
      setLearner(meResult.data);
      setIsLoading(false);
      return;
    }

    // 2. Fall back to stored device-local learner id
    const storedId = getStoredLearnerId();
    if (!storedId) {
      setLearner(null);
      setIsLoading(false);
      return;
    }
    const result = await learnerApi.get(storedId);
    if (result.ok) {
      storeLearner(result.data.id, result.data.displayName, result.data.email, result.data.role);
      setLearner(result.data);
    } else {
      clearStoredLearner();
      setLearner(null);
    }
=======
  const loadCurrentLearner = useCallback(async () => {
    const result = await authApi.me();
    setLearner(result.ok ? result.data : null);
>>>>>>> b5abe61 (Implemented 3)
    setIsLoading(false);
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    void loadFromStorage();
  }, [loadFromStorage]);

  const setAuthenticatedUser = useCallback((user: Learner) => {
    storeLearner(user.id, user.displayName, user.email, user.role);
    setLearner(user);
  }, []);

  const createLearner = useCallback(async (displayName: string) => {
    const result = await learnerApi.create(displayName);
    if (!result.ok) {
      return { ok: false as const, message: result.error.message };
    }
    storeLearner(result.data.id, result.data.displayName, result.data.email, result.data.role);
=======
    // One-time session check against the backend after mount, to avoid an
    // SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCurrentLearner();
  }, [loadCurrentLearner]);

  const register = useCallback(async (input: { displayName: string; email: string; password: string }) => {
    const result = await authApi.register(input);
    if (!result.ok) {
      return { ok: false as const, message: result.error.message };
    }
>>>>>>> b5abe61 (Implemented 3)
    setLearner(result.data);
    return { ok: true as const };
  }, []);

<<<<<<< HEAD
  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    clearStoredLearner();
=======
  const login = useCallback(async (input: { email: string; password: string }) => {
    const result = await authApi.login(input);
    if (!result.ok) {
      return { ok: false as const, message: result.error.message };
    }
    setLearner(result.data);
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
>>>>>>> b5abe61 (Implemented 3)
    setLearner(null);
  }, []);

  return (
<<<<<<< HEAD
    <LearnerContext.Provider
      value={{ learner, isLoading, createLearner, setAuthenticatedUser, refresh: loadFromStorage, signOut }}
    >
=======
    <LearnerContext.Provider value={{ learner, isLoading, register, login, refresh: loadCurrentLearner, signOut }}>
>>>>>>> b5abe61 (Implemented 3)
      {children}
    </LearnerContext.Provider>
  );
}
