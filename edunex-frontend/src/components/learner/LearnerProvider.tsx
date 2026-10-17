"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { learnerApi } from "@/lib/api-client";
import { clearStoredLearner, getStoredLearnerId, storeLearner } from "@/lib/learner-storage";
import type { Learner } from "@/types/learner";

export interface LearnerContextValue {
  learner: Learner | null;
  isLoading: boolean;
  /** Creates a new learner profile and persists it as this device's active learner. */
  createLearner: (displayName: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Re-fetches the active learner from the backend (e.g. after updating preferences elsewhere). */
  refresh: () => Promise<void>;
  signOut: () => void;
}

export const LearnerContext = createContext<LearnerContextValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const storedId = getStoredLearnerId();
    if (!storedId) {
      setLearner(null);
      setIsLoading(false);
      return;
    }
    const result = await learnerApi.get(storedId);
    if (result.ok) {
      setLearner(result.data);
    } else {
      // The stored id no longer resolves to a real learner (e.g. the
      // backend's database was reset) -- don't keep pretending it's valid.
      clearStoredLearner();
      setLearner(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // One-time restore from localStorage, which must happen after mount to
    // avoid an SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFromStorage();
  }, [loadFromStorage]);

  const createLearner = useCallback(async (displayName: string) => {
    const result = await learnerApi.create(displayName);
    if (!result.ok) {
      return { ok: false as const, message: result.error.message };
    }
    storeLearner(result.data.id, result.data.displayName);
    setLearner(result.data);
    return { ok: true as const };
  }, []);

  const signOut = useCallback(() => {
    clearStoredLearner();
    setLearner(null);
  }, []);

  return (
    <LearnerContext.Provider value={{ learner, isLoading, createLearner, refresh: loadFromStorage, signOut }}>
      {children}
    </LearnerContext.Provider>
  );
}
