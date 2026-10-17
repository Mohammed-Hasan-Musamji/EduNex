"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi, learnerApi } from "@/lib/api-client";
import { clearStoredLearner, getStoredLearnerId, storeLearner } from "@/lib/learner-storage";
import type { Learner } from "@/types/learner";

export interface LearnerContextValue {
  learner: Learner | null;
  isLoading: boolean;
  /** Creates a new learner profile and persists it as this device's active learner. */
  createLearner: (displayName: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Explicitly sets the active authenticated user (learner or admin). */
  setAuthenticatedUser: (user: Learner) => void;
  /** Re-fetches the active learner/user from the backend. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const LearnerContext = createContext<LearnerContextValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(false);
  }, []);

  useEffect(() => {
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
    setLearner(result.data);
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    clearStoredLearner();
    setLearner(null);
  }, []);

  return (
    <LearnerContext.Provider
      value={{ learner, isLoading, createLearner, setAuthenticatedUser, refresh: loadFromStorage, signOut }}
    >
      {children}
    </LearnerContext.Provider>
  );
}
